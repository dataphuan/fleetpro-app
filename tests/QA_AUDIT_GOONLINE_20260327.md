# QA Audit Go-Online - V1 Online Repo

Date: 2026-03-27
Scope: d:/AI-KILLS/V1-quanlyxeonline
Target web app: https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/exec
Tenant A: internal-tenant-1
Tenant B: internal-tenant-2

## 1) Executed QA commands

1. node scripts/online-health-check.js
2. node scripts/online-release-gate.js --webapp <exec_url> --tenant-a internal-tenant-1 --tenant-b internal-tenant-2
3. node scripts/qa-object-tab-audit.js --webapp-a <exec_url> --tenant-a internal-tenant-1
4. ./scripts/qa-full-check.ps1
5. Manual smoke checks with Invoke-RestMethod for:
	- GET action=tenant-config tenant_id=unknown-tenant-zz
	- POST type=authLogin
	- POST type=registerUser

## 2) Results summary

- Health check: PASS (4/4)
  - Endpoint responsive
  - GET parsing
  - POST handler available
  - Error handling present

- Release gate: FAIL
  - PASS: tenant resolver for tenant A
  - FAIL: unknown tenant fallback contract (expected error+not-found, received status=ok tenant default)
  - PASS: list trips tenant A (rows=3)
  - FAIL: list trips tenant B (tenant not found)
  - FAIL: phase-2 authLogin endpoint availability (Unknown POST type)
  - FAIL: phase-2 registerUser endpoint availability (Unknown POST type)
  - SKIP: token role checks (tokens not supplied)

- Object-tab audit: PASS with SKIPs
  - PASS: vehicles/drivers/customers/routes/trips/expenses/maintenance data sources
  - SKIP: RBAC token tests and cross-webapp checks (tokens / webapp B not supplied)

- Full QA script (PowerShell): FAIL
  - PASS: env presence, list endpoints, tenant config active
  - FAIL: tenant fallback not-found
  - FAIL: authLogin endpoint (Unknown POST type)
  - FAIL: registerUser endpoint (Unknown POST type)

## 3) Blocking findings (No-Go)

1. Runtime fallback contract mismatch
	- Unknown tenant should return status=error and fallback=not-found.
	- Current runtime returns active default tenant (status=ok).

2. Phase-2 auth endpoints unavailable on live runtime
	- POST type=authLogin returns Unknown POST type.
	- POST type=registerUser returns Unknown POST type.

3. Tenant B not configured/available
	- Cross-tenant gate cannot complete because tenant B is not resolvable.

4. Deployment automation dependency missing in current machine
  - `clasp` CLI is not installed, so direct push/deploy to Apps Script cannot be executed from this environment.

## 4) Decision

Final decision: NO-GO

Rationale: Core runtime contract for tenant fallback and phase-2 auth APIs is not aligned with expected go-live criteria.

## 5) Required actions before re-audit

1. Redeploy Apps Script web app with latest backend-gas.js containing:
	- Correct tenant fallback behavior (no root fallback when tenant hint is provided)
	- POST handlers: authLogin and registerUser
2. Ensure tenant B exists and is active in Tenants sheet if multi-tenant gate is required.
3. Provide user/editor/admin tokens to complete RBAC gate checks.
4. Re-run commands in section 1 and require all blockers cleared.

## 6) Tooling fixes applied in this repo during audit

1. scripts/online-health-check.js
	- Added fetch fallback compatible with Node versions that expose global fetch.
	- Removed hard dependency on node-fetch when not needed.

2. scripts/qa-full-check.ps1
	- Rewrote for PowerShell 5.1 compatibility and current repo layout.
	- Added explicit checks for fallback contract and auth endpoint availability.

3. scripts/online-release-gate.js
  - Added phase-2 endpoint contract checks for `authLogin` and `registerUser`.

4. scripts/go-live-audit.ps1
  - Added one-command audit orchestration for health + release gate + object-tab + full QA.

