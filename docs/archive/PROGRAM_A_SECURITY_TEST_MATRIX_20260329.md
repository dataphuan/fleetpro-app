# Program A - Security Test Matrix (Tenant + RBAC)

Date: 2026-03-29
Applies to Sprint 1

## 1) Role Set (Canonical)

1. admin
2. manager
3. dispatcher
4. accountant
5. driver
6. viewer

## 2) Tenant Test Actors

1. user_admin_tenant_a
2. user_manager_tenant_a
3. user_dispatcher_tenant_a
4. user_accountant_tenant_a
5. user_driver_tenant_a
6. user_viewer_tenant_a
7. user_admin_tenant_b

## 3) Case Matrix

Legend:
1. EXPECT: ALLOW or DENY
2. RESULT: PASS or FAIL

| Case ID | Collection | Operation | Actor | Tenant Target | EXPECT | RESULT | Notes |
|---|---|---|---|---|---|---|---|
| A-001 | vehicles | read | user_viewer_tenant_a | tenant_a | ALLOW | TBD | |
| A-002 | vehicles | read | user_viewer_tenant_a | tenant_b | DENY | TBD | |
| A-003 | vehicles | create | user_dispatcher_tenant_a | tenant_a | ALLOW | TBD | |
| A-004 | vehicles | create | user_dispatcher_tenant_a | tenant_b | DENY | TBD | tenant spoof attempt |
| A-005 | drivers | read | user_manager_tenant_a | tenant_a | ALLOW | TBD | |
| A-006 | drivers | update | user_driver_tenant_a | tenant_a | DENY | TBD | role restriction |
| A-007 | routes | read | user_viewer_tenant_a | tenant_a | ALLOW | TBD | |
| A-008 | customers | read | user_accountant_tenant_a | tenant_a | ALLOW | TBD | |
| A-009 | trips | create | user_dispatcher_tenant_a | tenant_a | ALLOW | TBD | |
| A-010 | trips | update | user_driver_tenant_a | tenant_a | DENY | TBD | if outside allowed workflow |
| A-011 | expenses | create | user_accountant_tenant_a | tenant_a | ALLOW | TBD | |
| A-012 | expenses | delete | user_accountant_tenant_a | tenant_a | DENY | TBD | per policy |
| A-013 | maintenance | read | user_manager_tenant_a | tenant_a | ALLOW | TBD | |
| A-014 | maintenance | update | user_driver_tenant_a | tenant_a | DENY | TBD | |
| A-015 | users | read self | user_driver_tenant_a | own uid | ALLOW | TBD | |
| A-016 | users | read other | user_driver_tenant_a | tenant_a other uid | DENY | TBD | |
| A-017 | users | update role | user_admin_tenant_a | tenant_a | ALLOW | TBD | admin mutation |
| A-018 | users | update role | user_manager_tenant_a | tenant_a | DENY | TBD | escalation denied |
| A-019 | users | create | user_admin_tenant_a | tenant_b | DENY | TBD | cross-tenant denied |
| A-020 | trips | read | user_admin_tenant_a | tenant_b | DENY | TBD | strict isolation |

## 4) Mandatory Coverage Rule

Before Sprint 1 sign-off:
1. All A-001..A-020 must be executed.
2. Any DENY case failing as ALLOW is blocking-critical.
3. Any ALLOW case failing as DENY is blocking-major.

## 5) Evidence Index

Execution record:
1. Executor:
2. Date:
3. Commit:
4. Command log path:

Artifacts:
1. commands.log:
2. raw-test-output.log:
3. decision.md:
