# Tests (templates)

This folder contains templates and examples for testing the 1-ONLINE Apps Script logic.

Notes:
- Apps Script code cannot be executed directly in Node.js without adaptation.
- For unit testing, extract pure JS helpers into testable modules or use `gas-local` tooling.

Examples to add:
- test_upsert.md: example payloads to exercise `upsert` via `set-spreadsheet` script or curl.

## Multi-tenant QA matrix (Phase 6)

1. Tenant isolation
	- Tenant A token cannot list/get Tenant B records.
	- Cross-tenant key probing returns error/empty.
2. Authorization scope
	- `editor_tenant` can mutate own tenant only.
	- `user_tenant` cannot call mutation endpoints.
3. Business integrity
	- Flow: `createTrip -> add expenses -> closeTrip` per tenant.
	- Validate close guard: expense/revenue > 120% requires `forceOverride=true`.
4. Fallback behavior
	- `tenant-config` unknown domain -> `fallback=not-found`.
	- API failure path -> `fallback=error`.

## Suggested smoke script order

1. `GET ?action=tenant-config&tenant_id=<tenantA-domain>`
2. `GET ?action=list&resource=trips&tenant_id=<tenantA>`
3. `POST type=createTrip` (tenant A token)
4. `POST type=closeTrip` with and without `forceOverride`
5. Repeat for tenant B and ensure no data bleed-through
