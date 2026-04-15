# FleetPro V1 - Sprint 1 Execution Plan (Program A)

Date: 2026-03-29
Sprint duration: 10 working days
Source of truth:
- docs/MVP_UPGRADE_MASTER_PLAN_20260329.md
- docs/FIRESTORE_MIGRATION_EXECUTION_PLAN.md
- docs/ONLINE_ARCHITECTURE_CLOUDFLARE_FIREBASE.md

## 1) Sprint Goal

Deliver tenant security hardening so that tenant isolation and role enforcement are verifiable by test evidence before production deploy.

Sprint success condition:
1. Firestore Rules enforce tenant boundary for all tenant-bound collections.
2. Role escalation scenarios are denied by rules.
3. Security test matrix has pass evidence and is integrated in release gate.

## 2) Scope Locked For Sprint 1

In-scope:
1. Rules hardening and consistency with app RBAC roles:
   - admin, manager, dispatcher, accountant, driver, viewer
2. Emulator-based allow/deny test suite expansion.
3. Release gate update with required security evidence artifacts.

Out-of-scope:
1. Billing/paywall feature changes.
2. Driver PWA new features.
3. New business module development.

## 3) Work Breakdown

### WP-A1: RBAC + Rules Alignment

Owner: Engineering
Target: Day 1-2

Tasks:
1. Align Firestore role checks to current app role model.
2. Remove legacy role branches in rules and tests.
3. Validate users/{uid}.tenant_id and role as authority source.

Deliverables:
1. Updated firestore.rules
2. Rule notes in security test doc

Acceptance criteria:
1. Rule set references only active role model.
2. No permissive fallback path remains for tenant access.

### WP-A2: Tenant Isolation Test Matrix

Owner: Engineering + QA
Target: Day 3-5

Tasks:
1. Build explicit allow/deny matrix by role and tenant pair.
2. Cover read/create/update/delete for:
   - vehicles, drivers, routes, customers, trips, expenses, maintenance, users
3. Add negative tests for tenant spoofing attempt.

Deliverables:
1. Expanded tests/firestore.rules.test.cjs
2. Matrix evidence file under docs

Acceptance criteria:
1. Tenant A cannot access Tenant B in all tested collections.
2. Non-admin roles denied for admin-only user mutations.

### WP-A3: Security Gate Integration

Owner: Ops + QA
Target: Day 6-7

Tasks:
1. Standardize command set for security gate execution.
2. Define mandatory artifacts for merge/release.
3. Add GO/NO-GO checklist for security gate.

Deliverables:
1. Security gate checklist in docs
2. Evidence index with date and executor

Acceptance criteria:
1. Gate cannot pass without evidence files.
2. Release candidate blocked when any critical deny-case fails.

### WP-A4: Regression + Sign-off

Owner: QA Lead + Engineering Lead
Target: Day 8-10

Tasks:
1. Run full local gate:
   - npm run lint
   - npm run typecheck
   - npm run build
2. Run security gate and archive logs.
3. Final sprint sign-off report.

Deliverables:
1. Sprint sign-off note
2. Updated release readiness status

Acceptance criteria:
1. Technical gate pass.
2. Security matrix pass with archived evidence.
3. Signed GO for moving to Sprint 2.

## 4) Day-by-Day Plan

Day 1:
1. Freeze Sprint 1 scope.
2. Finalize role model mapping and rule policy baseline.

Day 2:
1. Complete rules alignment and review.
2. Prepare test case list from matrix.

Day 3:
1. Implement allow/deny tests for core collections.
2. Validate deny path for tenant mismatch.

Day 4:
1. Add users collection admin-only mutation tests.
2. Add spoofed tenant_id create attempt tests.

Day 5:
1. Stabilize flaky tests.
2. Produce matrix evidence draft.

Day 6:
1. Integrate security gate checklist into release flow.
2. Document mandatory evidence artifacts.

Day 7:
1. Dry-run release gate with current branch.
2. Fix gate integration issues.

Day 8:
1. Run full technical gate.
2. Run full security gate.

Day 9:
1. Address regressions.
2. Re-run failing tests until stable.

Day 10:
1. Final QA sign-off.
2. Publish sprint closure report and next sprint handoff.

## 5) Security Evidence Pack (Mandatory)

Required files per run:
1. Security command output log.
2. Test matrix status table (pass/fail by case id).
3. Rule version hash and test commit id.
4. GO/NO-GO decision note signed by QA + Engineering.

Naming convention:
1. docs/evidence/security/YYYYMMDD/commands.log
2. docs/evidence/security/YYYYMMDD/matrix.md
3. docs/evidence/security/YYYYMMDD/decision.md

## 6) Risks and Mitigation

Risk 1: Role mismatch between app and rules
1. Mitigation: lock role enum and validate in test preconditions.

Risk 2: Incomplete test coverage by collection
1. Mitigation: matrix requires all tenant-bound collections before sign-off.

Risk 3: Emulator environment instability
1. Mitigation: run test twice before evidence finalization and keep raw logs.

## 7) Exit Gate for Sprint 1

Sprint 1 is complete only if all conditions are true:
1. WP-A1 to WP-A4 accepted.
2. Security evidence pack archived.
3. Technical gate and security gate both pass.
4. Handoff note ready for Sprint 2 (Program B).
