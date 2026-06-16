# Architecture

## Purpose

This repo models a governed AI support knowledge agent for B2B SaaS teams. The system drafts customer replies from approved help content, cites sources, evaluates policy risk, and records audit events for human review.

## Components

```text
Next.js dashboard
  Ticket queue, answer workspace, policy panel, KB freshness, audit log

Next.js API routes
  Local JSON-backed ticket and draft endpoints

Python support-agent engine
  Deterministic retrieval, drafting, policy, freshness behavior

Shared contracts
  JSON schemas for data exchanged across web and agent boundaries

Seed data
  Mock tickets, knowledge articles, policy settings, audit events
```

## Data Flow

1. The dashboard loads local seed data from `apps/web/data/seed-data.json`.
2. The selected ticket is scored against indexed knowledge articles.
3. The agent simulation retrieves the top matching articles and creates a cited draft.
4. Policy logic checks confidence, sensitive topics, blocked actions, stale docs, conflicting docs, and missing coverage.
5. The UI displays the draft, decision, citations, reviewer role, and local approval state.
6. The audit panel shows seeded events plus current local review state.

## Important Design Choices

- Retrieval is deterministic keyword scoring so tests can assert exact behavior.
- All integrations are mocked/local by default.
- Sensitive actions are blocked by policy rather than hidden in UI copy.
- JSON schemas are shared across the repo to keep the frontend, tests, and agent aligned.
- The dashboard is the first screen; there is no marketing landing page.

## Production Extensions

- Replace local JSON with Postgres or SQLite plus migrations.
- Add authenticated users and role-based approval workflows.
- Store immutable audit events server-side.
- Replace deterministic drafting with a model-backed service that enforces citations.
- Add helpdesk integration behind explicit credentials and tenant isolation.
