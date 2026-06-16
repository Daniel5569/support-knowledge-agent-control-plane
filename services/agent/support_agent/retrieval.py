from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable


TOKEN_MIN_LENGTH = 3


@dataclass(frozen=True)
class RetrievalResult:
    article: dict
    score: int


def _tokens(value: str) -> set[str]:
    return {
        token
        for token in re.sub(r"[^a-z0-9_\s]", " ", value.lower()).split()
        if len(token) >= TOKEN_MIN_LENGTH
    }


def retrieve_articles(ticket: dict, articles: Iterable[dict], limit: int = 5) -> list[RetrievalResult]:
    ticket_tokens = _tokens(
        " ".join(
            [
                ticket["subject"],
                ticket["body"],
                " ".join(ticket.get("tags", [])),
            ]
        )
    )

    results: list[RetrievalResult] = []
    for article in articles:
        article_tokens = _tokens(" ".join([article["title"], article["productArea"], article["body"]]))
        score = len(ticket_tokens.intersection(article_tokens))
        if score:
            results.append(RetrievalResult(article=article, score=score))

    return sorted(results, key=lambda item: (-item.score, item.article["id"]))[:limit]
