export type Ticket = {
  id: string;
  customer: string;
  plan: string;
  channel: "email" | "slack" | "portal" | "chat";
  subject: string;
  body: string;
  status: "open" | "triage" | "waiting_on_agent" | "approved" | "rejected" | "escalated";
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: string;
  slaDueAt: string;
  tags: string[];
};

export type KnowledgeArticle = {
  id: string;
  title: string;
  productArea: string;
  body: string;
  sourceUrl: string;
  owner: string;
  lastReviewedAt: string;
  freshnessStatus: "fresh" | "review_due" | "stale";
  version: string;
};

export type AgentDraft = {
  id: string;
  ticketId: string;
  responseText: string;
  citations: Array<{ articleId: string; title: string; sourceUrl: string }>;
  confidence: number;
  missingInfo: string[];
  proposedAction: "auto_reply" | "request_clarification" | "escalate" | "kb_review";
  riskFlags: string[];
};

export type Policy = {
  autoSendConfidenceThreshold: number;
  approvalRequiredTopics: string[];
  blockedActions: string[];
  supportLeadRole: string;
};

export type PolicyDecision = {
  draftId: string;
  allowAutoSend: boolean;
  requiresApproval: boolean;
  escalationReason: string;
  blockedActions: string[];
  reviewerRole: string;
};

export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  targetId: string;
  timestamp: string;
  summary: string;
  policySnapshot: string;
};

export type SeedData = {
  policy: Policy;
  tickets: Ticket[];
  knowledgeArticles: KnowledgeArticle[];
  auditEvents: AuditEvent[];
};
