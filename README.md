# Support Knowledge Agent Control Plane

A governed AI support agent for B2B SaaS teams that drafts cited replies from approved knowledge, enforces policy rules before any action is taken, and records every decision in an audit trail — so AI reduces ticket load without silently making unsafe calls. The system pairs a Next.js 15 control dashboard with a deterministic Python retrieval-and-drafting engine, sharing typed JSON Schema contracts across both boundaries.

- Keyword-intersection retrieval that is deterministic by design so unit tests can assert exact article ranking, not probabilistic output
- A composable risk-flag layer that runs stale-doc detection, contradiction detection, sensitive-topic classification, and SLA scoring independently and folds them into a single policy decision
- Contract-validated data exchange between the web layer and the agent engine, preventing silent type drift across the TypeScript/Python boundary

---

## Quick Start

**Prerequisites:** Node.js ≥ 20.11, Python 3.12

```bash
git clone https://github.com/Daniel5569/support-knowledge-agent-control-plane.git
cd support-knowledge-agent-control-plane
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The dashboard runs entirely on seeded local data. No external API, LLM, or helpdesk connection is made. To run the full stack including the Python agent engine:

```bash
docker-compose up
```

Expected output after `npm run dev`:

```
▲ Next.js 15.3.4
- Local: http://localhost:3000
- Environments: .env
✓ Ready in 1.2s
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│             Next.js Dashboard  (port 3000)                  │
│   Ticket queue · Answer workspace · Policy panel            │
│   KB freshness · Audit log                                  │
│                                                             │
│   /api/tickets         /api/drafts/[ticketId]               │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP  (AGENT_ENGINE_URL)
┌───────────────────────────▼─────────────────────────────────┐
│           Python Agent Engine  (port 8080)                  │
│   retrieval → drafting → policy                             │
│   GET /drafts/:id   GET /freshness   GET /health            │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│            Seed Data  apps/web/data/seed-data.json          │
│   tickets · knowledgeArticles · policy · auditEvents        │
└───────────────────────────┬─────────────────────────────────┘
                            │ schema contracts
┌───────────────────────────▼─────────────────────────────────┐
│       packages/shared/contracts/*.schema.json               │
│   Ticket · Article · Draft · PolicyDecision · AuditEvent    │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Technology |
|---|---|
| Dashboard | Next.js 15 (App Router), React 19, TypeScript |
| Agent engine | Python 3.12, stdlib `http.server` |
| Shared contracts | JSON Schema (Draft-07) |
| Infrastructure | Docker Compose |
| CI | GitHub Actions (Node 20 + Python 3.12) |
| Validation tooling | Node.js ESM scripts (`tools/`) |

---

## Key Features

**Deterministic retrieval engine**
`retrieval.py` scores knowledge articles against tickets using token-intersection counting over a normalized token set. No embeddings, no model calls. Retrieval output is reproducible across environments, which means tests assert exact article rankings rather than checking probabilistic proximity — a meaningful property when auditing which sources were used for a given customer reply.

**Composable risk-flag pipeline**
Risk signals are detected independently: `stale_knowledge` fires when any cited article has `freshnessStatus: stale`; `conflicting_docs` fires when two retrieved articles assert different numeric values for the same field; `sla_risk` fires on ticket priority; `missing_coverage` fires on an explicit ticket tag. These flags compose into the confidence formula and then into the policy decision, so adding a new risk signal does not require touching the policy logic.

**Policy layer with explicit action blocking**
`policy.py` separates three distinct concerns: auto-send eligibility (confidence threshold), approval routing (sensitive topic classification), and hard action blocking (`issue_refund`, `cancel_contract`, `change_sso_config`). Blocked actions are returned in the `PolicyDecision` response so the frontend can disable controls — the restriction lives in the engine, not in UI copy that can drift.

**Contract-validated cross-language boundary**
JSON Schemas in `packages/shared/contracts/` define every object that crosses the web/agent boundary. The `test-contracts.mjs` tool validates that seed data and API responses conform to these schemas. TypeScript types in `lib/types.ts` are derived from the same schema definitions, so a field rename in Python surfaces as a contract test failure before it becomes a runtime error.

**KB freshness analysis**
`freshness.py` aggregates article `freshnessStatus` counts and surfaces the owners of articles in `review_due` or `stale` state. The freshness summary feeds into the dashboard's KB health view and into the risk-flag pipeline, creating a closed loop between content maintenance and live policy decisions.

**Full audit trail on every decision**
Every draft, citation list, policy decision, reviewer role assignment, and human action (approve/reject/escalate) is recorded as an `AuditEvent`. The schema enforces actor, action, timestamp, and associated IDs so audit records are structurally complete — no optional fields that make log queries ambiguous.

---

## Project Structure

```
.
├── apps/web/                          # Next.js 15 dashboard
│   ├── app/
│   │   ├── api/
│   │   │   ├── tickets/route.ts       # Ticket list endpoint
│   │   │   └── drafts/[ticketId]/     # Draft generation endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Root page (dashboard entry point)
│   ├── components/
│   │   ├── Dashboard.tsx              # Main layout: queue + workspace + panels
│   │   ├── ConfidenceBar.tsx          # Confidence score visualisation
│   │   └── StatusBadge.tsx            # Ticket status and priority badges
│   ├── data/
│   │   └── seed-data.json             # Mock tickets, articles, policy, audit events
│   └── lib/
│       ├── agent-simulation.ts        # Browser-side mirror of the Python agent logic
│       └── types.ts                   # TypeScript types matching the JSON Schema contracts
│
├── services/agent/                    # Python support-agent engine
│   ├── support_agent/
│   │   ├── worker.py                  # HTTP server entry point (port 8080)
│   │   ├── retrieval.py               # Token-intersection article retrieval
│   │   ├── drafting.py                # Draft builder and risk-flag composer
│   │   ├── policy.py                  # Policy decision engine and action blocking
│   │   └── freshness.py               # KB freshness aggregation
│   └── tests/
│       └── test_support_agent.py      # Deterministic unit tests
│
├── packages/shared/contracts/         # JSON Schema contracts (shared across layers)
│   ├── ticket.schema.json
│   ├── article.schema.json
│   ├── draft.schema.json
│   ├── policy-decision.schema.json
│   └── audit-event.schema.json
│
├── tools/                             # Repo health and verification scripts
│   ├── check.mjs                      # Orchestrates the full verification suite
│   ├── lint-repo.mjs                  # Required file and gitignore checks
│   ├── security-check.mjs             # Secret and artifact scan
│   ├── test-contracts.mjs             # JSON Schema validation against seed data
│   ├── run-python-tests.mjs           # Python unittest runner (cross-platform)
│   ├── npm-audit.mjs                  # Dependency vulnerability audit
│   └── compose-check.mjs              # Docker Compose config validation
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── RUNBOOK.md
│   ├── SECURITY_REVIEW.md
│   └── PUBLISHING_GUIDE.md
│
├── .github/workflows/ci.yml           # CI: check suite on push and pull request
├── .env.example                       # Environment variable reference
├── docker-compose.yml                 # Web + agent services
├── LICENSE
└── package.json
```

---

## API / Usage

The Python agent engine exposes three endpoints. All responses are JSON.

**Draft generation for a ticket**

```
GET http://localhost:8080/drafts/TCK-1001
```

```json
{
  "draft": {
    "id": "DRF-1001",
    "ticketId": "TCK-1001",
    "responseText": "Thanks for reaching out. Based on our current support knowledge, password reset links expire after 60 minutes for security. To request a new one, visit the login page and select 'Forgot password'. I can help with the next safe step while keeping this request within policy.",
    "citations": [
      {
        "articleId": "ART-004",
        "title": "Password Reset and Account Recovery",
        "sourceUrl": "https://docs.example.local/account/password-reset"
      }
    ],
    "confidence": 0.82,
    "missingInfo": [],
    "proposedAction": "auto_reply",
    "riskFlags": []
  },
  "decision": {
    "draftId": "DRF-1001",
    "allowAutoSend": true,
    "requiresApproval": false,
    "escalationReason": "Meets confidence and policy requirements",
    "blockedActions": [],
    "reviewerRole": "agent"
  }
}
```

**Draft for a policy-blocked ticket**

```
GET http://localhost:8080/drafts/TCK-1003
```

```json
{
  "draft": {
    "id": "DRF-1003",
    "ticketId": "TCK-1003",
    "responseText": "Thanks for reaching out. Based on our current support knowledge, subscription cancellations are processed within one business day. I can help with the next safe step while keeping this request within policy.",
    "citations": [
      {
        "articleId": "ART-007",
        "title": "Cancellation and Refund Policy",
        "sourceUrl": "https://docs.example.local/billing/refunds-cancellations"
      }
    ],
    "confidence": 0.35,
    "missingInfo": [],
    "proposedAction": "escalate",
    "riskFlags": ["billing", "refund", "cancellation", "angry_customer"]
  },
  "decision": {
    "draftId": "DRF-1003",
    "allowAutoSend": false,
    "requiresApproval": true,
    "escalationReason": "Sensitive topic: billing, refund, cancellation, angry_customer; Confidence below auto-send threshold",
    "blockedActions": ["issue_refund", "cancel_contract"],
    "reviewerRole": "support_lead"
  }
}
```

---

## Configuration

| Variable | Description | Example value | Required |
|---|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Display name shown in the dashboard header | `Support Knowledge Agent Control Plane` | No |
| `AGENT_ENGINE_URL` | Base URL of the Python agent HTTP server | `http://agent:8080` | No |
| `MOCK_DATA_MODE` | When `true`, the dashboard uses local seed data and skips live agent calls | `true` | No |

When `AGENT_ENGINE_URL` is not set or `MOCK_DATA_MODE` is `true`, the Next.js layer runs `agent-simulation.ts` in-process instead of calling the Python engine. This is the default for local development without Docker.

---

## Why This Project Matters

B2B SaaS support teams face a specific AI adoption problem: every team wants AI to reduce ticket load, but the moment the AI touches a refund, a cancellation, or a security configuration, the risk profile of a wrong answer is measured in lost revenue and broken customer trust — not just a bad NPS score. The missing piece is not a better language model; it is a control layer that enforces policy before output reaches a customer, maintains an auditable record of every source cited, and surfaces knowledge gaps to the people responsible for fixing them. This repo models that control layer in production-ready form, separating retrieval, drafting, policy, and freshness into independently testable components so the architecture is legible to an engineering team evaluating whether to build or buy.

---

## Verification

```bash
npm run check        # repo shape, contracts, Python tests, secret scan, build
npm run check:full   # same suite plus npm audit
```

Full documentation: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/RUNBOOK.md](docs/RUNBOOK.md) · [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md)

## License

MIT — see [LICENSE](LICENSE).
