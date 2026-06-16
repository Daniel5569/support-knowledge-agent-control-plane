from __future__ import annotations

from collections import Counter
from datetime import date


def summarize_freshness(articles: list[dict]) -> dict:
    counts = Counter(article["freshnessStatus"] for article in articles)
    owners_due = sorted(
        {
            article["owner"]
            for article in articles
            if article["freshnessStatus"] in {"review_due", "stale"}
        }
    )
    oldest_review = min(date.fromisoformat(article["lastReviewedAt"]) for article in articles)

    return {
        "fresh": counts["fresh"],
        "review_due": counts["review_due"],
        "stale": counts["stale"],
        "owners_due": owners_due,
        "oldest_review": oldest_review.isoformat(),
    }
