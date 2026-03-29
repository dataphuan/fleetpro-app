# Online V3 Release Gate — Execution Guide

This guide runs practical checks for `1-ONLINE` against deployed Apps Script Web App.

## 1) Quick run (minimum)

```bash
node 1-ONLINE/scripts/online-release-gate.js --webapp WEBAPP_URL --tenant-a TENANT_A
```

Checks included:
- tenant resolver for active tenant
- unknown tenant fallback `not-found`
- list trips for tenant A

## 2) Full run (recommended)

```bash
node 1-ONLINE/scripts/online-release-gate.js \
  --webapp WEBAPP_URL \
  --tenant-a TENANT_A \
  --tenant-b TENANT_B \
  --user-token TENANT_A_USER_TOKEN \
  --editor-token TENANT_A_EDITOR_TOKEN
```

Additional checks included:
- cross-tenant isolation read probe (A cannot fetch B trip key)
- role enforcement (`user_tenant` token cannot mutate)
- close-trip mutation is intentionally **not auto-executed** by script to avoid unsafe writes

## 3) Env-based run

Script auto-reads `1-ONLINE/.env` if available.

Supported env keys:
- `VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL`
- `TENANT_A`
- `TENANT_B`
- `TENANT_USER_TOKEN`
- `TENANT_EDITOR_TOKEN`

Then run:

```bash
node 1-ONLINE/scripts/online-release-gate.js
```

## 4) Exit code contract

- `0`: all required checks passed
- `1`: at least one required check failed
- `2`: missing required arguments

## 5) Go/No-Go interpretation

Go for Wave 1 only when:
- release-gate script exits `0` for target tenant(s)
- no cross-tenant leak evidence
- no auth bypass evidence
- close-trip guard validated on controlled test flow per `DEPLOY.md`
