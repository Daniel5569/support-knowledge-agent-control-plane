from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "services" / "agent"))

from support_agent.drafting import build_draft
from support_agent.freshness import summarize_freshness
from support_agent.retrieval import retrieve_articles


SEED = json.loads((ROOT / "apps" / "web" / "data" / "seed-data.json").read_text(encoding="utf-8"))


class SupportAgentTests(unittest.TestCase):
    def test_password_reset_retrieves_password_article(self) -> None:
        ticket = next(item for item in SEED["tickets"] if item["id"] == "TCK-1001")
        results = retrieve_articles(ticket, SEED["knowledgeArticles"])

        self.assertGreaterEqual(results[0].score, 2)
        self.assertEqual(results[0].article["id"], "KB-001")

    def test_refund_request_requires_approval_and_blocks_actions(self) -> None:
        ticket = next(item for item in SEED["tickets"] if item["id"] == "TCK-1003")
        result = build_draft(ticket, SEED["knowledgeArticles"], SEED["policy"])

        self.assertTrue(result["decision"]["requiresApproval"])
        self.assertFalse(result["decision"]["allowAutoSend"])
        self.assertIn("issue_refund", result["decision"]["blockedActions"])
        self.assertIn("cancel_contract", result["decision"]["blockedActions"])

    def test_conflicting_docs_are_detected(self) -> None:
        ticket = next(item for item in SEED["tickets"] if item["id"] == "TCK-1004")
        result = build_draft(ticket, SEED["knowledgeArticles"], SEED["policy"])

        self.assertIn("conflicting_docs", result["draft"]["riskFlags"])
        self.assertEqual(result["draft"]["proposedAction"], "kb_review")
        self.assertTrue(result["decision"]["requiresApproval"])

    def test_missing_coverage_requests_clarification(self) -> None:
        ticket = next(item for item in SEED["tickets"] if item["id"] == "TCK-1005")
        result = build_draft(ticket, SEED["knowledgeArticles"], SEED["policy"])

        self.assertIn("missing_coverage", result["draft"]["riskFlags"])
        self.assertEqual(result["draft"]["proposedAction"], "request_clarification")
        self.assertGreaterEqual(len(result["draft"]["missingInfo"]), 1)

    def test_freshness_summary_counts_articles(self) -> None:
        summary = summarize_freshness(SEED["knowledgeArticles"])

        self.assertEqual(summary["fresh"], 2)
        self.assertEqual(summary["review_due"], 2)
        self.assertEqual(summary["stale"], 2)
        self.assertIn("product-ops", summary["owners_due"])


if __name__ == "__main__":
    unittest.main()
