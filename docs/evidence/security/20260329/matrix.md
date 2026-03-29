# Security Matrix Result - 2026-03-29

Executor: <name>
Commit: <hash>
Rules file hash: <hash>

## Case Matrix

| Case ID | Description | Expected | Actual | Result |
|---|---|---|---|---|
| A-001 | Tenant A read own vehicles | Allow | SKIPPED | [ ] |
| A-002 | Tenant A read tenant B vehicles | Deny | SKIPPED | [ ] |
| A-003 | Non-admin update users role | Deny | SKIPPED | [ ] |
| A-004 | Admin update users role in own tenant | Allow | SKIPPED | [ ] |
| A-005 | Spoof tenant_id on create trip | Deny | SKIPPED | [ ] |
| A-006 | Driver write admin collection | Deny | SKIPPED | [ ] |

## Summary
- **Status**: SKIPPED
- **Reason**: Firebase CLI authentication not detected. Emulator tests cannot run without active session.
- **Action**: Run `firebase login` and execute `scripts/run-audit-gates.ps1` again.
