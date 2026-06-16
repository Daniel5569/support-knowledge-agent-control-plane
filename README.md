# Support Knowledge Agent Control Plane

## 60-second overview

This is a production-style portfolio repo for a governed AI customer support agent. It helps a SaaS support team draft customer replies from approved help docs, cite the sources used, detect stale or conflicting knowledge, and require human approval before risky actions like refunds, cancellations, or security changes.

The point is control, not chatbot novelty: support leads get a queue, answer workspace, policy decision panel, knowledge freshness view, and audit log so AI can reduce workload without silently making unsafe decisions.

## What You Can Demo

- Ticket queue with SLA risk, confidence, escalation reason, and suggested action.
- Agent answer workspace with citations, missing information, policy checks, and approval controls.
- Knowledge base freshness view for stale, conflicting, and missing coverage.
- Policy control panel for approval thresholds and blocked sensitive actions.
- Audit log for every draft, source, policy decision, and human action.
- Deterministic Python support-agent engine for retrieval, drafting, policy, and freshness behavior.

## Why It Matters

B2B SaaS teams often want AI support automation, but founders and CTOs worry about incorrect answers, stale docs, refunds, security topics, and missing audit trails. This repo shows the control layer that makes an AI support agent credible for real operations.

## Architecture

```text
apps/web
  Next.js dashboard, API route handlers, local seed data, UI components

services/agent
  Python support-agent engine with deterministic retrieval and policy logic

packages/shared/contracts
  JSON schemas for Ticket, KnowledgeArticle, AgentDraft, PolicyDecision, AuditEvent

tools
  Repo shape checks, contract tests, Python test runner, security scan, compose validation

docs
  Architecture, runbook, security review, publishing handoff
```

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The dashboard uses seeded local data only. No CRM, helpdesk, LLM, or external API is contacted by default.

## Verification

```bash
npm run check
```

`npm run check` runs repo shape checks, contract tests, Python agent tests, a local secret/artifact scan, Docker Compose config validation, the Next.js build, and npm audit when dependencies are installed. Use it before publishing.

On Windows, if PowerShell uses a broken `npm.ps1`, run the same command through `npm.cmd`:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run check
```

## Demo Scenarios

- Password reset: high-confidence answer with cited docs and auto-reply eligibility.
- Enterprise SSO outage: urgent escalation, SLA risk, and human approval.
- Refund/cancellation: auto-send blocked by policy.
- Conflicting documentation: contradiction detected and KB review suggested.
- Missing knowledge: safe clarification response and KB gap recommendation.

## Security Posture

- No real secrets or customer data are included.
- `.env.example` is the only environment file intended for Git.
- Mock integrations only unless explicitly configured later.
- Sensitive actions are blocked by default and require approval.
- Audit events are local seeded examples, not production logs.

Read [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md) and [docs/PUBLISHING_GUIDE_IT.md](docs/PUBLISHING_GUIDE_IT.md) before pushing to GitHub.
