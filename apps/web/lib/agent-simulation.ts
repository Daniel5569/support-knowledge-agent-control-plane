import type { AgentDraft, KnowledgeArticle, Policy, PolicyDecision, Ticket } from "./types";

const TOKEN_MIN_LENGTH = 3;
const SENSITIVE_TAGS = new Set(["billing", "legal", "security", "refund", "cancellation", "angry_customer"]);

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= TOKEN_MIN_LENGTH);
}

export function scoreArticles(ticket: Ticket, articles: KnowledgeArticle[]) {
  const ticketTokens = new Set(tokenize(`${ticket.subject} ${ticket.body} ${ticket.tags.join(" ")}`));

  return articles
    .map((article) => {
      const articleTokens = tokenize(`${article.title} ${article.productArea} ${article.body}`);
      const score = articleTokens.reduce((total, token) => total + (ticketTokens.has(token) ? 1 : 0), 0);
      return { article, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.article.id.localeCompare(right.article.id))
    .slice(0, 5);
}

export function detectRiskFlags(ticket: Ticket, articles: KnowledgeArticle[]) {
  const flags = new Set<string>();
  ticket.tags.forEach((tag) => {
    if (SENSITIVE_TAGS.has(tag)) {
      flags.add(tag);
    }
  });

  if (ticket.priority === "urgent") {
    flags.add("sla_risk");
  }

  if (articles.some((article) => article.freshnessStatus === "stale")) {
    flags.add("stale_knowledge");
  }

  const exportLimits = articles
    .map((article) => article.body.match(/([0-9]{5,6}) rows/i)?.[1])
    .filter(Boolean);

  if (new Set(exportLimits).size > 1) {
    flags.add("conflicting_docs");
  }

  if (ticket.tags.includes("missing_knowledge")) {
    flags.add("missing_coverage");
  }

  return Array.from(flags);
}

export function decidePolicy(draft: AgentDraft, ticket: Ticket, policy: Policy): PolicyDecision {
  const sensitiveTags = ticket.tags.filter((tag) => policy.approvalRequiredTopics.includes(tag));
  const blockedActions = sensitiveTags.includes("refund") || sensitiveTags.includes("cancellation")
    ? ["issue_refund", "cancel_contract"]
    : sensitiveTags.includes("security")
      ? ["change_sso_config", "share_security_details"]
      : [];

  const requiresApproval =
    draft.confidence < policy.autoSendConfidenceThreshold ||
    sensitiveTags.length > 0 ||
    draft.riskFlags.includes("conflicting_docs") ||
    draft.riskFlags.includes("missing_coverage");

  return {
    draftId: draft.id,
    allowAutoSend: !requiresApproval,
    requiresApproval,
    escalationReason: requiresApproval
      ? [
          sensitiveTags.length ? `Sensitive topic: ${sensitiveTags.join(", ")}` : "",
          draft.riskFlags.includes("conflicting_docs") ? "Conflicting documentation detected" : "",
          draft.riskFlags.includes("missing_coverage") ? "Knowledge coverage gap detected" : "",
          draft.confidence < policy.autoSendConfidenceThreshold ? "Confidence below auto-send threshold" : ""
        ]
          .filter(Boolean)
          .join("; ")
      : "Meets confidence and policy requirements",
    blockedActions,
    reviewerRole: requiresApproval ? policy.supportLeadRole : "agent"
  };
}

export function buildDraftForTicket(ticket: Ticket, articles: KnowledgeArticle[], policy: Policy) {
  const ranked = scoreArticles(ticket, articles);
  const citedArticles = ranked.map((item) => item.article);
  const riskFlags = detectRiskFlags(ticket, citedArticles);
  const hasCoverage = citedArticles.length > 0 && !riskFlags.includes("missing_coverage");
  const confidence = Math.max(
    0.35,
    Math.min(0.94, 0.58 + citedArticles.length * 0.08 - riskFlags.length * 0.1)
  );

  const proposedAction = riskFlags.includes("conflicting_docs")
    ? "kb_review"
    : riskFlags.includes("missing_coverage")
      ? "request_clarification"
      : riskFlags.some((flag) => SENSITIVE_TAGS.has(flag) || flag === "sla_risk")
        ? "escalate"
        : "auto_reply";

  const draft: AgentDraft = {
    id: `DRF-${ticket.id.replace("TCK-", "")}`,
    ticketId: ticket.id,
    responseText: hasCoverage
      ? `Thanks for reaching out. Based on our current support knowledge, ${citedArticles[0].body} I can help with the next safe step while keeping this request within policy.`
      : "Thanks for the context. I do not have enough approved knowledge to answer this completely, so I will ask a clarifying question and flag the missing coverage for review.",
    citations: citedArticles.map((article) => ({
      articleId: article.id,
      title: article.title,
      sourceUrl: article.sourceUrl
    })),
    confidence: Number(confidence.toFixed(2)),
    missingInfo: riskFlags.includes("missing_coverage")
      ? ["No approved article covers custom renewal probability field mapping."]
      : riskFlags.includes("conflicting_docs")
        ? ["Two source articles disagree on export row limits."]
        : [],
    proposedAction,
    riskFlags
  };

  return {
    draft,
    decision: decidePolicy(draft, ticket, policy),
    retrievedArticles: citedArticles
  };
}
