# Security Review

## Scope

This review covers the local demo repo before GitHub publication. It focuses on accidental secret exposure, unsafe mock-to-production assumptions, policy bypass risk, and auditability.

## Data Handling

- The repo uses mock ticket, customer, knowledge, and audit data only.
- No real API keys, access tokens, customer records, invoices, or helpdesk exports are included.
- `.env.example` is safe to publish and contains placeholders/local defaults only.
- `.env`, `.env.*`, logs, caches, databases, screenshots, and generated build outputs are ignored by Git.

## Threat Model

| Risk | Control |
| --- | --- |
| Secret accidentally committed | `.gitignore`, local `tools/security-check.mjs`, and publication checklist |
| Agent auto-sends risky answer | Policy engine blocks sensitive topics and low confidence |
| Refund/cancellation executed without approval | Blocked actions require support lead review |
| Stale or conflicting docs produce unsafe answer | Freshness and contradiction flags lower confidence and require review |
| Audit trail missing human action | UI models approval state; production extension should persist immutable events |
| Mock demo mistaken for production service | README and runbook call out deterministic/local limitations |

## Security Checks

Run before publishing:

```bash
npm run security
npm run check
git status --short
```

The local security check scans text files for common secret formats, private keys, password/token assignments, generated directories, and local personal paths.

## Known Demo Limitations

- No authentication or authorization is implemented.
- Audit events are seeded/local, not immutable server records.
- The agent does not call an LLM or external retrieval service.
- The local HTTP agent service is not hardened for hostile network exposure.
- Docker Compose is intended for local demo validation only.

## Publication Policy

Publish only source files, docs, seed mock data, schemas, and safe config examples. Do not publish `.env`, real logs, local database files, screenshots with private data, generated build artifacts, or any copied customer exports.
