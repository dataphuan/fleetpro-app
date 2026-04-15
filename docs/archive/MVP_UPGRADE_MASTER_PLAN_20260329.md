# FleetPro V1 Online - MVP Upgrade Master Plan

Date: 2026-03-29
Scope: Upgrade program aligned to current MVP roadmap and production architecture
References:
- docs/ONLINE_ARCHITECTURE_CLOUDFLARE_FIREBASE.md
- docs/FIRESTORE_MIGRATION_EXECUTION_PLAN.md
- docs/DEPLOY_EXECUTION_PLAN_20260329.md
- docs/RELEASE_NOTES_CLOUDFLARE_FULL_20260328.md
- docs/ONLINE_PRODUCTION_AUDIT_LOG_20260329.md

## 1) Program Objectives

Primary objective:
- Deliver a stable SaaS-ready MVP on Cloudflare Pages + Firebase with strict tenant isolation, production billing control, and mobile driver workflow.

Success definition:
- Security pass: tenant isolation enforced by Firestore Rules and verified by emulator tests.
- Product pass: core operations flow pass (create trip -> dispatch -> close trip).
- Revenue pass: subscription/paywall/quota behavior enforced in production.
- Operations pass: release gates and rollback flow validated.

## 2) Upgrade Programs (No ad-hoc scope)

### Program A - Tenant Security Hardening

Goal:
- Remove role/tenant drift between UI, adapter, and Firestore rules.

In-scope deliverables:
1. Single RBAC role model across app and rules:
   - admin, manager, dispatcher, accountant, driver, viewer
2. Strict tenant guard for all tenant-bound collections.
3. Firestore allow/deny emulator tests for role and tenant matrix.

Exit criteria:
1. Tenant A cannot read or write Tenant B data.
2. Non-admin role cannot perform admin-only mutations.
3. Security test suite integrated in release gate.

Owner:
- Engineering (Backend + Frontend)

### Program B - Firestore First Cutover Completion

Goal:
- Complete removal of legacy runtime dependency from production CRUD path.

In-scope deliverables:
1. 100% Firestore CRUD for:
   - vehicles, drivers, routes, customers, trips, expenses, maintenance
2. Required fields baseline for business documents:
   - tenant_id, created_at, updated_at, created_by, updated_by
3. Firestore index coverage for high-frequency queries.

Exit criteria:
1. No runtime legacy CRUD calls in production network trace.
2. Build + lint + typecheck pass.
3. Migration smoke tests pass by tenant account.

Owner:
- Engineering (Frontend + Data)

### Program C - Billing, Paywall, Quota Enforcement

Goal:
- Convert billing from UI-level behavior to operational SaaS control plane.

In-scope deliverables:
1. Subscription schema per tenant (plan, status, billing dates, grace policy).
2. Quota enforcement at mutation layer, not UI only.
3. Payment callback flow with automatic unlock and audit trail.

Exit criteria:
1. Expired tenant behavior matches approved policy.
2. Quota hard-stop works on actual create mutations.
3. Billing state transitions logged and traceable.

Owner:
- Product + Engineering + Ops

### Program D - Driver Mobile PWA Production Flow

Goal:
- Move driver flow from scaffold to operational execution in field usage.

In-scope deliverables:
1. Driver workflow states:
   - assigned -> started -> in_progress -> completed
2. Receipt upload to Firebase Storage with tenant-safe access control.
3. Real-time trip status sync to dispatcher view.

Exit criteria:
1. Driver completes trip and uploads proof from mobile.
2. Dispatcher sees updated state in operations screen.
3. Storage access scoped by tenant and trip relation.

Owner:
- Engineering (Mobile Web + Operations)

### Program E - Go-live Reliability and Release Discipline

Goal:
- Standardize release quality and reduce incident impact.

In-scope deliverables:
1. Release branch policy and immutable build evidence.
2. Post-deploy smoke matrix by role and tenant.
3. Rollback runbook tested on previous stable deployment.

Exit criteria:
1. Every release has gate evidence attached.
2. Rollback achievable within one release cycle.
3. Critical auth/tenant leakage checks pass post-deploy.

Owner:
- Ops + QA + Engineering

## 3) Sprint Timeline (Execution Order)

### Sprint 1-2

Target:
- Program A complete

Mandatory outputs:
1. Finalized RBAC role model in app + rules.
2. Firestore rules regression tests in CI-quality gate.
3. Tenant leakage test report.

### Sprint 3-4

Target:
- Program B complete

Mandatory outputs:
1. Firestore-first CRUD verification report.
2. Index validation for top query paths.
3. Legacy runtime dependency removal checklist.

### Sprint 5

Target:
- Program C complete

Mandatory outputs:
1. Billing and quota enforcement validation matrix.
2. Paywall behavior by plan state.
3. Payment unlock smoke test evidence.

### Sprint 6

Target:
- Program D complete

Mandatory outputs:
1. Driver mobile workflow pass evidence.
2. Storage upload and access rule validation.
3. Dispatcher sync flow pass.

### Sprint 7

Target:
- Program E complete and production go-live gate

Mandatory outputs:
1. Full release checklist completed.
2. Post-deploy smoke report signed off.
3. Rollback drill result documented.

## 4) Release Gate Policy

### Technical gate (must pass)

1. npm run lint
2. npm run typecheck
3. npm run build

### Security gate (must pass)

1. Firestore tenant isolation allow/deny tests pass.
2. Role escalation scenarios denied by rules.
3. Users document tenant_id and role integrity checks pass.

### Business gate (must pass)

1. createTrip -> dispatch -> closeTrip flow pass.
2. Expense creation and trip expense aggregation pass.
3. Quota and paywall behavior pass by plan state.

### Ops gate (must pass)

1. Cloudflare environment variables complete and verified.
2. Firestore rules and indexes applied before traffic open.
3. Rollback target deployment identified.
4. Online audit checklist executed against production auth endpoint and evidence attached.

## 5) Owner RACI (Simplified)

1. Product Owner:
   - Approves billing policy and quota limits.
2. Engineering Lead:
   - Owns Programs A-B-D implementation quality.
3. Ops Lead:
   - Owns Program E release readiness and rollback safety.
4. QA Lead:
   - Owns gate evidence and sign-off matrix.

## 6) Decision Log Required Before Final Go-live

1. Billing expired policy:
   - read-only grace period or immediate hard lock.
2. Final quota limits:
   - vehicles, users, trips per plan.
3. Payment operations mode:
   - sandbox to production switchover date and owner.
4. Tenant onboarding standard:
   - mandatory users document fields and bootstrap process.

## 7) Current Baseline and Next Action

Current baseline:
- Local gates currently green in latest checks (lint, typecheck, build in prior release evidence).
- Firebase-first architecture already active in current codebase.

Immediate next action:
1. Start Sprint 1 with Program A test matrix implementation and security evidence collection.
2. Freeze scope by release branch per deployment runbook before production push.
