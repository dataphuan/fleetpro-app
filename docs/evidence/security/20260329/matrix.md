# Security Matrix Result - 2026-03-29

Executor: <name>
Commit: <hash>
Rules file hash: <hash>

## Case Matrix

| Case ID | Description | Expected | Actual | Result |
|---|---|---|---|---|
| A-001 | Tenant A read own vehicles | Allow |  | PASS/FAIL |
| A-002 | Tenant A read tenant B vehicles | Deny |  | PASS/FAIL |
| A-003 | Non-admin update users role | Deny |  | PASS/FAIL |
| A-004 | Admin update users role in own tenant | Allow |  | PASS/FAIL |
| A-005 | Spoof tenant_id on create trip | Deny |  | PASS/FAIL |
| A-006 | Driver write admin collection | Deny |  | PASS/FAIL |

## Summary
- Total cases:
- Passed:
- Failed:
- Critical failed cases:
