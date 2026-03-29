# FleetPro V1 - Firestore Migration Execution Plan

Last updated: 2026-03-28
Owner: Product + Engineering + Ops

## 1) Executive Decision (User Review Required)

This migration is a strategic trade-off:
- Benefit: major performance gain, real multi-tenant isolation at database layer, cleaner SaaS scaling.
- Cost: stop manual editing in Google Sheets/Excel for production data.

Required business decision:
- Approve full operation via FleetPro Web UI only.

Recommended policy:
- Keep an export-only bridge for finance backup (CSV/XLSX export), no direct data write from Sheets.

## 2) Current Audit Snapshot (V1 workspace)

Validation on current source:
- TypeScript check: PASS
- Production build: PASS
- ESLint: PASS with warnings (no blocking errors)

Notes:
- Core Firestore foundation already exists:
  - Firebase client setup
  - Firestore-based adapter
  - Pricing and paywall components
  - Driver and portal layout scaffolding

## 3) Security Architecture (Must-have)

### 3.1 Data model (tenant-first)
All tenant-bound collections must include tenant_id:
- tenants
- users
- trips
- vehicles
- drivers
- routes
- customers
- expenses
- maintenance

### 3.2 Firestore security rules (production baseline)
Use strict tenant guard with role checks and create/update separation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthed() {
      return request.auth != null;
    }

    function userDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function tenantId() {
      return userDoc().data.tenant_id;
    }

    function userRole() {
      return userDoc().data.role;
    }

    function sameTenantOnCreate() {
      return request.resource.data.tenant_id == tenantId();
    }

    function sameTenantOnReadUpdateDelete() {
      return resource.data.tenant_id == tenantId();
    }

    match /users/{uid} {
      allow read: if isAuthed() && (
        uid == request.auth.uid ||
        (sameTenantOnReadUpdateDelete() && userRole() in ['admin', 'admin_tenant'])
      );
      allow create: if isAuthed() && sameTenantOnCreate() && userRole() in ['admin', 'admin_tenant'];
      allow update, delete: if isAuthed() && sameTenantOnReadUpdateDelete() && userRole() in ['admin', 'admin_tenant'];
    }

    match /{collection}/{docId} {
      allow create: if isAuthed() && sameTenantOnCreate();
      allow read, update, delete: if isAuthed() && sameTenantOnReadUpdateDelete();
    }
  }
}
```

Important:
- Never trust tenant_id from localStorage alone.
- Rules must be the final enforcement point.
- Use Auth UID + users/{uid} as source of truth.

## 4) Migration Phases

### Phase A - Foundation hardening (1-2 days)
1. Finalize Firestore collections + indexes.
2. Finalize rules with tenant/role enforcement.
3. Add emulator tests for allow/deny scenarios.

Exit criteria:
- tenant A cannot read/write tenant B data.
- non-admin cannot perform admin mutation.

### Phase B - Data adapter cutover (2-4 days)
1. Remove Google Sheets write path for core entities.
2. Keep optional read-only export/report bridge.
3. Enforce adapter queries by tenant_id and role.

Exit criteria:
- vehicles/drivers/routes/customers/trips/expenses all CRUD on Firestore.

### Phase C - Subscription & quota guard (2-3 days)
1. Tenant subscription schema active in tenants/company settings.
2. PaywallGuard enforces expiration mode.
3. Quota guard blocks create when limits reached.

Default policy recommendation:
- expired mode = read-only for 7-day grace, then hard lock.

### Phase D - Payment integrations (2-5 days)
1. PayPal sandbox -> production verification.
2. MoMo payment creation via backend bridge (GAS endpoint).
3. Auto-extend next_billing_date after successful payment callback.

Exit criteria:
- payment success triggers unlock automatically.

### Phase E - Driver mobile PWA (2-4 days)
1. Driver-only route and layout.
2. Trip workflow quick actions.
3. Receipt upload to Firebase Storage with scoped rules.

Exit criteria:
- driver can complete trip update and upload receipt from mobile.

## 5) Verification Matrix (Release Gate)

Security:
- user tenant-1 tries read tenant-2 trips -> DENY (Missing or insufficient permissions)
- user tenant-1 tries write tenant-2 vehicles -> DENY

Performance:
- list query with 50k dataset under indexed fields -> target p95 < 200ms backend response

Business integrity:
- close trip guard (>120% cost/revenue) enforced unless explicit override role
- audit log row created for every mutation

Billing:
- basic plan blocks 11th vehicle create if limit=10
- expired tenant sees paywall and cannot mutate data

## 6) Deployment Plan (GitHub + Deploy)

1. Create feature branch:
   - feat/firestore-migration-phase-a
2. Commit scope by phase only (avoid mixed giant commit).
3. Open PR with:
   - security rules diff
   - emulator test evidence
   - QA checklist result
4. Deploy order:
   - Firestore rules + indexes
   - frontend
   - payment bridge endpoint
5. Post-deploy smoke:
   - tenant isolation
   - login
   - create trip
   - close trip guard
   - payment unlock path

## 7) Rollback Plan

- Keep legacy Google Sheets adapter behind feature flag for 1 release window.
- If critical incident:
  1) switch feature flag to legacy read/write mode
  2) rollback frontend to previous tag
  3) keep Firestore data untouched for forensic diff

## 8) Decisions Needed From Owner

Please confirm these 4 decisions before production cutover:
1. Approve no-manual-edit policy in Google Sheets for production data.
2. Billing expired mode: read-only grace (recommended) or immediate hard lock.
3. Basic plan quotas: confirm final limits (vehicles/trips/users).
4. Approve MoMo flow via backend bridge endpoint to protect secret key.
