"""Deterministic support-agent engine for the local demo."""

from .drafting import build_draft
from .freshness import summarize_freshness
from .policy import decide_policy
from .retrieval import retrieve_articles

__all__ = ["build_draft", "decide_policy", "retrieve_articles", "summarize_freshness"]
