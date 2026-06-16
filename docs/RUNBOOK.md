# Runbook

## Start Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Run the Agent Service

```bash
python -m services.agent.support_agent.worker
```

Useful local endpoints:

- `GET /health`
- `GET /freshness`
- `GET /drafts/TCK-1001`

## Run Checks

```bash
npm run check
```

When dependencies are not installed, the check runner still executes repo shape checks, contract checks, Python tests, security scan, and Docker Compose config validation. After `npm install`, it also runs the Next build and npm audit.

## Add a Demo Scenario

1. Add a ticket to `apps/web/data/seed-data.json`.
2. Add or update matching knowledge articles.
3. Update tests in `services/agent/tests/test_support_agent.py`.
4. Run `npm run check`.
5. Add a short note to the README if the scenario demonstrates a new product behavior.

## Safe Production Path

Before adapting this to production, add authentication, tenant isolation, persistent storage, immutable audit logging, real approval workflows, and model-output safety tests. Keep external credentials out of source control and load them through deployment secrets.
