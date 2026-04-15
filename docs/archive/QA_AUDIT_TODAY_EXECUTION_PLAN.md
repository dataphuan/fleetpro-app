# 🎯 QA AUDIT EXECUTION - TODAY (2026-03-31)
**FleetPro V1 Online | Production Release Audit**

---

## 📋 TODAY'S CRITICAL PATH

```
09:00 ← PHASE C: Level 2 Release Gate (30 min)
09:30 ← PHASE D: Level 3 Full Smoke (60 min)  
11:00 ← PHASE E: Level 4 RBAC Matrix (90 min)
12:30 ← GO/NO-GO DECISION (30 min)
13:00 ← FINAL DECISION: GO LIVE or NO-GO
```

**Total time:** ~4 hours  
**Buffer:** +1.5 hours for debugging

---

## ⚡ PRE-REQUISITES (Must Complete First)

### ✅ Phase A - Pre-Flight (Should be DONE from 2026-03-30)

| Task | Status | Details |
|------|--------|---------|
| Issue #1 Fix | ✅ DONE | Tenant fallback contract (verified) |
| Issue #2 Fix | ✅ DONE | authLogin endpoint (verified) |
| Issue #3 Fix | ✅ DONE | registerUser endpoint (verified) |
| Issue #4 Setup | ⏳ NEEDED | Firestore Tenant B documents |

### ✅ Phase B - Level 1 Health Check (Should be DONE from 2026-03-30)

```powershell
# If not done yet, run:
node scripts/online-health-check.js --endpoint https://fleetpro-app.pages.dev
# Expected: Endpoint reachable, page loads <5s, no console errors
```

---

## 🚀 TODAY'S EXECUTION

### STEP 1: Firestore Tenant B Setup (5 minutes)

**If not done yet:**

1. Go to: https://console.firebase.google.com/project/fleetpro-app/firestore
2. Create collection: `tenants`
3. Add Document `internal-tenant-1`:
   - Fields: name, status, tier, region, created_at, owner_email, domain, app_name
4. Add Document `internal-tenant-2`:
   - Fields: name, status, tier, region, created_at, owner_email, domain, app_name

**[See detailed field values in QA_AUDIT_EXECUTION_TRACKER_20260330.md]**

---

### STEP 2: Phase C - Level 2 Release Gate (30 minutes)

**9:00 AM - Execute**

```powershell
cd d:\AI-KILLS\V1-quanlyxeonline

# Run release gate test
$WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/exec"

node scripts/online-release-gate.js `
    --webapp $WEBAPP_URL `
    --tenant-a internal-tenant-1 `
    --tenant-b internal-tenant-2
```

**Success Criteria:**
```
[PASS] Tenant resolver active tenant
[PASS] Fallback not-found
[PASS] List trips tenant A
[PASS] List trips tenant B
[PASS] Isolation read probe A->B key
[PASS] Phase-2 authLogin endpoint available
[PASS] Phase-2 registerUser endpoint available

Summary: { passed: 7, failed: 0, skipped: 0 }
```

**If FAIL:**
→ Debug using [QA_AUDIT_COMMAND_REFERENCE.md](QA_AUDIT_COMMAND_REFERENCE.md)
→ Escalate to Backend Engineer if endpoints broken

---

### STEP 3: Phase D - Level 3 Full Smoke (60 minutes)

**9:30 AM - Execute**

Manual testing of 6 modules in browser:

1. **Auth Module (5 min)**
   - [ ] Login works
   - [ ] Logout works
   - [ ] Session persists
   - [ ] No console errors

2. **Vehicles Module (10 min)**
   - [ ] List loads <3s
   - [ ] Can create vehicle
   - [ ] Can edit vehicle
   - [ ] Can delete vehicle
   - [ ] Pagination works

3. **Drivers Module (10 min)**
   - [ ] List loads <3s
   - [ ] Can create driver
   - [ ] Can edit driver
   - [ ] Can delete driver
   - [ ] Multi-tenant isolation

4. **Dispatch Module (15 min)**
   - [ ] Trip creation workflow
   - [ ] Status changes (pending→in_transit→completed)
   - [ ] Trip assignment to driver
   - [ ] Real-time updates
   - [ ] No permission errors

5. **Finance Module (10 min)**
   - [ ] Expense dashboard
   - [ ] Report generation
   - [ ] Data filtering
   - [ ] PDF export

6. **Settings Module (10 min)**
   - [ ] User management
   - [ ] Role management
   - [ ] Permission enforcement
   - [ ] Settings save/load

**Success Criteria:**
- ✅ All 6 modules function correctly
- ✅ No 404/500 errors
- ✅ No JS console errors
- ✅ Load times <3s per page
- ✅ Multi-tenant isolation verified

**Log:** Take screenshots at each module checkpoint

---

### STEP 4: Phase E - Level 4 RBAC Matrix (90 minutes)

**11:00 AM - Execute**

Security testing matrix (20 test cases):

**Admin Role Tests (5 cases):**
- [ ] A-001: Admin can CRUD all resources ✅ ALLOW
- [ ] A-002: Admin cannot access other tenant's data ✅ DENY
- [ ] A-003: Admin can view audit logs ✅ ALLOW
- [ ] A-004: Admin cannot modify security settings ✅ DENY
- [ ] A-005: Admin can assign roles ✅ ALLOW

**Manager Role Tests (4 cases):**
- [ ] A-006: Manager can view/edit dispatch ✅ ALLOW
- [ ] A-007: Manager cannot delete users ✅ DENY
- [ ] A-008: Manager can view reports ✅ ALLOW
- [ ] A-009: Manager can export data ✅ ALLOW

**Driver Role Tests (3 cases):**
- [ ] A-010: Driver can view assigned trips ✅ ALLOW
- [ ] A-011: Driver cannot access vehicle list ✅ DENY
- [ ] A-012: Driver can update trip status ✅ ALLOW

**Viewer Role Tests (2 cases):**
- [ ] A-013: Viewer can see dashboards ✅ ALLOW
- [ ] A-014: Viewer cannot edit anything ✅ DENY

**Cross-Tenant Tests (6 cases):**
- [ ] A-015: Tenant A user cannot access Tenant B data ✅ DENY
- [ ] A-016: Tenant B user cannot access Tenant A data ✅ DENY
- [ ] A-017: No privilege escalation possible ✅ DENY
- [ ] A-018: Session doesn't bleed across tenants ✅ DENY
- [ ] A-019: Firestore rules enforce isolation ✅ DENY
- [ ] A-020: API responses filtered by tenant_id ✅ DENY

**Commands:** Use token-based requests
```powershell
# Example: Test with admin token
$token = $env:USER_ADMIN_TENANT_A_TOKEN
$headers = @{ "Authorization" = "Bearer $token" }

# Try unauthorized action
Invoke-RestMethod -Uri "https://fleetpro-app.pages.dev/api/users" `
    -Method DELETE `
    -Headers $headers `
    -Body @{ userId = "test-user-id" }
# Should return: 403 Forbidden
```

**Success Criteria:**
- ✅ 20/20 test cases PASS
- ✅ All ALLOW cases work
- ✅ All DENY cases blocked
- ✅ No security breaches discovered

---

## ✍️ SIGN-OFF TEMPLATE

### Phase C - Release Gate Sign-Off
```
Test Date: 2026-03-31
Time: 09:00
Tester: ________________
Result: [ ] PASS [ ] FAIL
Issues Found: ___________
```

### Phase D - Full Smoke Sign-Off
```
Test Date: 2026-03-31
Time: 09:30
Tester: ________________
Modules Passed: 6/6  [ ] YES [ ] NO
Issues Found: ___________
```

### Phase E - RBAC Matrix Sign-Off
```
Test Date: 2026-03-31
Time: 11:00
Tester: ________________
Test Cases Passed: 20/20  [ ] YES [ ] NO
Security Issues: ___________
```

---

## 🎯 GO/NO-GO DECISION (12:30 PM)

**Requires 3 Sign-Offs:**

- [ ] **QA Lead:** All phases PASS?  
  Signature: _________________ | Date: _____

- [ ] **Backend Owner:** Code quality acceptable?  
  Signature: _________________ | Date: _____

- [ ] **DevOps Owner:** Infrastructure ready?  
  Signature: _________________ | Date: _____

### Decision Matrix

| Level 1 | Level 2 | Level 3 | Level 4 | Decision |
|---------|---------|---------|---------|----------|
| PASS | PASS | PASS | PASS (20/20) | **GO LIVE** ✅ |
| PASS | PASS | PASS | PASS (≥95%) | **GO WITH CAUTION** ⚠️ |
| PASS | PASS | FAIL | ANY | **NO-GO** ❌ |
| PASS | FAIL | ANY | ANY | **NO-GO** ❌ |
| FAIL | ANY | ANY | ANY | **NO-GO** ❌ |

---

## 📞 ESCALATION CONTACTS

| Issue | Contact | Action |
|-------|---------|--------|
| Backend endpoint fails | Backend Engineer | Fix + redeploy |
| Firestore data missing | Data Engineer | Add documents |
| RBAC test fails | Security Lead | Investigate permissions |
| Performance <3s fails | DevOps | Optimize |

---

## 📊 EXPECTED OUTPUT

After completion:
```
audit-run-20260331-0900/
├── health-check.log
├── release-gate.log
├── smoke-test-screenshots/
├── rbac-matrix.log
└── go-no-go-decision.md
```

---

## ⏰ TIMELINE SUMMARY

| Time | Activity | Duration | Owner |
|------|----------|----------|-------|
| 09:00 | Phase C: Release Gate | 30 min | Backend QA |
| 09:30 | Phase D: Full Smoke | 60 min | QA Tester |
| 11:00 | Phase E: RBAC Matrix | 90 min | Security QA |
| 12:30 | Decision Meeting | 30 min | QA Lead + Owners |
| 13:00 | Final GO/NO-GO | - | Executive |

**Total: 3.5 hours of active audit**  
**Scheduled End: 13:00 (1:00 PM)**

---

Ready to start? Follow steps in order above.

→ First: Confirm Firestore setup complete  
→ Then: Run Phase C automatic test  
→ Then: Execute Phase D manual tests  
→ Then: Execute Phase E security tests  
→ Finally: Sign-off and make GO/NO-GO decision
