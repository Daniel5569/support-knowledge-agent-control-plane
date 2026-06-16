from __future__ import annotations


SENSITIVE_TAGS = {"billing", "legal", "security", "refund", "cancellation", "angry_customer"}


def decide_policy(ticket: dict, draft: dict, policy: dict) -> dict:
    sensitive_tags = [tag for tag in ticket.get("tags", []) if tag in policy["approvalRequiredTopics"]]
    risk_flags = set(draft.get("riskFlags", []))
    blocked_actions: list[str] = []

    if "refund" in sensitive_tags or "cancellation" in sensitive_tags:
        blocked_actions.extend(["issue_refund", "cancel_contract"])
    if "security" in sensitive_tags:
        blocked_actions.extend(["change_sso_config", "share_security_details"])

    requires_approval = (
        draft["confidence"] < policy["autoSendConfidenceThreshold"]
        or bool(sensitive_tags)
        or "conflicting_docs" in risk_flags
        or "missing_coverage" in risk_flags
    )

    reasons = []
    if sensitive_tags:
        reasons.append(f"Sensitive topic: {', '.join(sensitive_tags)}")
    if "conflicting_docs" in risk_flags:
        reasons.append("Conflicting documentation detected")
    if "missing_coverage" in risk_flags:
        reasons.append("Knowledge coverage gap detected")
    if draft["confidence"] < policy["autoSendConfidenceThreshold"]:
        reasons.append("Confidence below auto-send threshold")

    return {
        "draftId": draft["id"],
        "allowAutoSend": not requires_approval,
        "requiresApproval": requires_approval,
        "escalationReason": "; ".join(reasons) if reasons else "Meets confidence and policy requirements",
        "blockedActions": blocked_actions,
        "reviewerRole": policy["supportLeadRole"] if requires_approval else "agent",
    }
