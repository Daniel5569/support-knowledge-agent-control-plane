from __future__ import annotations

import re

from .policy import SENSITIVE_TAGS, decide_policy
from .retrieval import retrieve_articles


def _risk_flags(ticket: dict, articles: list[dict]) -> list[str]:
    flags = set(tag for tag in ticket.get("tags", []) if tag in SENSITIVE_TAGS)

    if ticket["priority"] == "urgent":
        flags.add("sla_risk")

    if any(article["freshnessStatus"] == "stale" for article in articles):
        flags.add("stale_knowledge")

    export_limits = [
        match.group(1)
        for article in articles
        if (match := re.search(r"([0-9]{5,6}) rows", article["body"], re.IGNORECASE))
    ]
    if len(set(export_limits)) > 1:
        flags.add("conflicting_docs")

    if "missing_knowledge" in ticket.get("tags", []):
        flags.add("missing_coverage")

    return sorted(flags)


def build_draft(ticket: dict, articles: list[dict], policy: dict) -> dict:
    retrieved = retrieve_articles(ticket, articles)
    cited_articles = [item.article for item in retrieved]
    flags = _risk_flags(ticket, cited_articles)
    has_coverage = bool(cited_articles) and "missing_coverage" not in flags
    confidence = max(0.35, min(0.94, 0.58 + len(cited_articles) * 0.08 - len(flags) * 0.10))

    if "conflicting_docs" in flags:
        proposed_action = "kb_review"
    elif "missing_coverage" in flags:
        proposed_action = "request_clarification"
    elif any(flag in SENSITIVE_TAGS or flag == "sla_risk" for flag in flags):
        proposed_action = "escalate"
    else:
        proposed_action = "auto_reply"

    if has_coverage:
        response_text = (
            f"Thanks for reaching out. Based on our current support knowledge, "
            f"{cited_articles[0]['body']} I can help with the next safe step while keeping this request within policy."
        )
    else:
        response_text = (
            "Thanks for the context. I do not have enough approved knowledge to answer this completely, "
            "so I will ask a clarifying question and flag the missing coverage for review."
        )

    draft = {
        "id": f"DRF-{ticket['id'].replace('TCK-', '')}",
        "ticketId": ticket["id"],
        "responseText": response_text,
        "citations": [
            {
                "articleId": article["id"],
                "title": article["title"],
                "sourceUrl": article["sourceUrl"],
            }
            for article in cited_articles
        ],
        "confidence": round(confidence, 2),
        "missingInfo": _missing_info(flags),
        "proposedAction": proposed_action,
        "riskFlags": flags,
    }

    return {
        "draft": draft,
        "decision": decide_policy(ticket, draft, policy),
        "retrievedArticles": cited_articles,
    }


def _missing_info(flags: list[str]) -> list[str]:
    if "missing_coverage" in flags:
        return ["No approved article covers custom renewal probability field mapping."]
    if "conflicting_docs" in flags:
        return ["Two source articles disagree on export row limits."]
    return []
