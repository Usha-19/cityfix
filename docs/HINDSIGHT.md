# Hindsight integration notes

CityFix uses the official `hindsight-client` Python SDK (v0.10.x) against a
Hindsight server (Hindsight Cloud or a self-hosted instance).

## Configuration

Set these in `backend/.env`:

```
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=<your key>
HINDSIGHT_MEMORY_BANK=cityfix
HINDSIGHT_TIMEOUT=60
```

Get an API key and base URL from the Connect page in Hindsight Cloud
(https://ui.hindsight.vectorize.io) or your self-hosted deployment.

## SDK surface actually used

| CityMemoryService method | Hindsight SDK call |
|---|---|
| `remember_complaint` | `client.retain(bank_id, content, context, metadata)` |
| `recall_related_issues` | `client.recall(bank_id, query, budget, max_tokens, include_entities)` → `.results[*].text/.type` |
| `remember_officer_action` | `client.retain(...)` |
| `remember_resolution_outcome` | `client.retain(...)` |
| `generate_issue_brief` | `client.reflect(bank_id, query, context, budget)` → `.text`, `.based_on` |
| bank bootstrap | `client.create_bank(bank_id, name, background, disposition)` |

Notes:
- `retain` metadata values must be strings; coordinates are stringified.
- The bank is created idempotently on first use (`ensure_bank`).
- `reflect.based_on` supplies the source memories used to ground briefs.

## Degraded mode

If `HINDSIGHT_API_KEY` is empty, the service does **not** fake success. Memory
operations are recorded as `skipped`, briefs are marked `degraded`, and the admin
Memory Monitor shows the feature as not configured. Complaints still persist to
PostgreSQL and detection still runs on local signals.

## Live integration test

```
cd backend
HINDSIGHT_API_KEY=... pytest -m integration
```
