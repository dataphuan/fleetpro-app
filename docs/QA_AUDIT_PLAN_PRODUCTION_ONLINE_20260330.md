# QA Audit Plan - Production Online Execution
**FleetPro V1 | Date: 2026-03-30 | Expert: Senior QA Architect (20+ years)**

---

## EXECUTIVE SUMMARY

This plan establishes a **repeatable, gate-driven production audit procedure** for FleetPro V1 Online (Cloudflare Pages + Firebase). Current state: **NO-GO with 4 blocking issues**. Target: **Full GO by 2026-03-31**.

**Current Blockers:**
1. ❌ Tenant fallback contract mismatch (Apps Script runtime)
2. ❌ Auth endpoints unavailable (authLogin, registerUser POST handlers)
3. ❌ Tenant B not resolvable in multi-tenant gate
4. ❌ RBAC token verification incomplete

---

## PART 1: AUDIT FRAMEWORK & GOVERNANCE

### 1.1 Audit Scope (3 Domains)

| Domain | Target | Criteria | Owner |
|--------|--------|----------|-------|
| **Technical Smoke** | Frontend (Cloudflare) | Reachability, UI render, navigation | QA Lead |
| **Runtime Contract** | Backend (Apps Script) | Tenant resolve, auth handlers, RBAC token validation | Backend Owner |
| **Data Integrity** | Firestore | Collections present, security rules enforced, cross-tenant isolation | Data Engineer |

### 1.2 Audit Levels (Staged)

1. **Level 1 - Health Check** (5 mins)  
   - Endpoint reachability, HTTP 200, no runtime errors

2. **Level 2 - Release Gate** (15 mins)  
   - Deploy contracts, auth flow, tenant isolation basics

3. **Level 3 - Full Smoke** (30 mins)  
   - All UI modules, CRUD operations, permission matrix sampling

4. **Level 4 - Security Matrix** (45 mins)  
   - Full RBAC execution (20 test cases A-001 to A-020)

### 1.3 Gate Decision Matrix

```
Level 1 PASS → Proceed to Level 2
Level 2 PASS → Proceed to Level 3  
Level 3 PASS → Proceed to Level 4
Level 4 PASS → **GO LIVE**

ANY FAIL → NO-GO + Blocker log
```

### 1.4 Mandatory Evidence Pack (Per Audit Run)

Each gate execution must attach:
```
audit-run-{TIMESTAMP}/
├── commands.log              # All CLI output + timestamps
├── gate-level-{N}-report.md  # Pass/fail checklist
├── screenshots/              # UI state at each checkpoint
│   ├── 01-auth-login.png
│   ├── 02-dashboard.png
│   ├── 03-vehicles.png
│   ├── 04-dispatch.png
│   ├── 05-reports.png
│   └── 06-console-errors.png
├── security-matrix.json      # RBAC test results
└── decision.md               # GO/NO-GO + owner sign-off
```

---

## PART 2: BLOCKING ISSUES - FIX ROADMAP

### Issue #1: Tenant Fallback Contract (CRITICAL)

**Current Behavior:**  
```javascript
GET action=tenant-config tenant_id=unknown-tenant-zz
Response: {status: "ok", tenant: "DEFAULT_TENANT"}  ❌ WRONG
```

**Expected Behavior:**  
```javascript
Response: {status: "error", code: "TENANT_NOT_FOUND", fallback: "not-found"}  ✅ CORRECT
```

**Fix Owner:** Backend Engineer  
**Fix Location:** `backend-gas.js` - tenant resolver  
**Validation Command:**
```powershell
node scripts/online-release-gate.js --webapp <URL> --tenant-a internal-tenant-1
# Must show: ✅ Unknown tenant correctly returns not-found
```

---

### Issue #2 & #3: Auth Endpoints + Tenant B Missing (CRITICAL)

**Current Behavior:**
```javascript
POST type=authLogin             → "Unknown POST type" ❌
POST type=registerUser          → "Unknown POST type" ❌
Tenant B lookup                 → "Tenant not found" ❌
```

**Fix Owner:** Backend Engineer + DevOps  
**Fix Actions:**
1. Deploy `backend-gas.js` with auth handlers:
   ```javascript
   case 'authLogin':
     // existing handler or add new
     break;
   case 'registerUser':
     // existing handler or add new
     break;
   ```
2. Verify Tenants sheet has both `internal-tenant-1` and `internal-tenant-2` entries
3. Re-run gate

**Validation Command:**
```powershell
node scripts/online-release-gate.js --webapp <URL> \
  --tenant-a internal-tenant-1 \
  --tenant-b internal-tenant-2
# Must show: ✅ All auth endpoints available
```

---

### Issue #4: RBAC Token Verification (MAJOR)

**Current State:** Tokens not supplied to security matrix tests.

**Fix Owner:** QA + Security Lead  
**Fix Actions:**
1. Generate test tokens for all 7 roles (admin, manager, dispatcher, accountant, driver, viewer, + cross-tenant):
   - Use staging backend to issue OAuth tokens
   - Store in secure vault (GitHub Secrets or .env.test)
   
2. Populate token environment:
   ```powershell
   $env:USER_ADMIN_TENANT_A_TOKEN = "xxx"
   $env:USER_MANAGER_TENANT_A_TOKEN = "xxx"
   # ... etc for all roles
   ```

3. Re-run matrix test

**Validation Command:**
```powershell
npm run test:security-matrix
# Must show: ✅ All 20 RBAC cases result in PASS
```

---

## PART 3: PRODUCTION AUDIT EXECUTION (STEP-BY-STEP)

### Phase A: Pre-Flight (Day 0 - 2026-03-30)

**✅ Completion Checklist:**

- [ ] **A1** - All 4 blocking issues assigned to owners (Backend, DevOps, QA)
- [ ] **A2** - Fixes coded and deployed to staging
- [ ] **A3** - Apps Script redeploy completed with correct handlers
- [ ] **A4** - Tenant B verified in Firestore
- [ ] **A5** - Test token vault populated (GitHub Secrets)
- [ ] **A6** - Local builds green:
  ```powershell
  npm run lint      # PASS
  npm run typecheck # PASS
  npm run build     # PASS
  ```
- [ ] **A7** - Audit script dependencies verified:
  ```powershell
  node --version        # >=16
  firebase --version    # >=11
  gcloud --version      # optional but recommended
  ```

### Phase B: Level 1 Audit - Health Check (30 mins)

**Owner:** QA Lead  
**Run Command:**
```powershell
node scripts/online-health-check.js --endpoint https://fleetpro-app.pages.dev
```

**Expected Output:**
```
✅ Endpoint reachable: 200 OK
✅ GET parsing functional
✅ POST handler available
✅ Error handling present
Result: PASS
Duration: <2s
```

**Pass Criteria:**  
- HTTP 200 within 5s
- No runtime errors in console
- Auth form renders

**If FAIL:** Stop. Debug endpoint. Update Cloudflare config.

---

### Phase C: Level 2 Audit - Release Gate (30 mins)

**Owner:** Backend QA  
**Run Command:**
```powershell
node scripts/online-release-gate.js `
  --webapp https://fleetpro-app.pages.dev `
  --tenant-a internal-tenant-1 `
  --tenant-b internal-tenant-2
```

**Execution Checklist:**

| # | Test Case | Command | Expected | Status |
|---|-----------|---------|----------|--------|
| 1 | Tenant resolver A | GET tenant config tenant_id=internal-tenant-1 | status=ok, active tenant | [ ] PASS |
| 2 | Unknown tenant fallback | GET tenant config tenant_id=unknown-xyz | status=error, code=NOT_FOUND | [ ] PASS |
| 3 | List trips tenant A | POST type=tripList tenant_a rows count | rows > 0 | [ ] PASS |
| 4 | List trips tenant B | POST type=tripList tenant_b rows count | rows > 0 | [ ] PASS |
| 5 | Auth endpoint authLogin | POST type=authLogin + creds | token response or error | [ ] PASS |
| 6 | Auth endpoint registerUser | POST type=registerUser + data | user created or error | [ ] PASS |

**Blockers (NO-GO if any FAIL):**
- Cases 1, 2, 5, 6 must PASS
- Case 3, 4 status warning only (data not critical)

**If ANY FAIL:** Return to Phase A, fix, redeploy Apps Script, then restart Phase B.

---

### Phase D: Level 3 Audit - Full Smoke (60 mins)

**Owner:** QA Functions Tester  
**Run Command:**
```powershell
./scripts/qa-full-check.ps1
```

**Execution Checklist:**

#### Module 1: Auth Flow (10 mins)
```
[ ] Login page loads in <=5s
[ ] Demo account credentials work
[ ] Session persists on page refresh
[ ] Role/tenant context preserved
[ ] Logout clears session
[ ] Invalid credentials rejected
```

#### Module 2: Vehicles & Drivers (15 mins)
```
[ ] Vehicles list renders (sample: >5 rows)
[ ] Vehicle detail page opens
[ ] Create vehicle dialog works
[ ] Edit vehicle saves (demo data)
[ ] Delete with confirmation
[ ] Drivers list renders
[ ] Driver detail, create, edit operations work
[ ] No console errors
```

#### Module 3: Dispatch Flow (15 mins)
```
[ ] Routes list renders
[ ] Customers list renders
[ ] Trips list renders
[ ] Create trip: opens form, saves, appears in list
[ ] Update trip status: new → assigned → in_progress → completed
[ ] Dispatch panel updates in real-time
[ ] No permission errors for dispatcher role
```

#### Module 4: Finance & Reporting (15 mins)
```
[ ] Dashboard widgets render (KPIs, charts)
[ ] Expenses list renders
[ ] Create expense: opens form, saves, aggregates to trip
[ ] Reports generate without timeout
[ ] No blank data sections
```

#### Module 5: Settings & Users (10 mins)
```
[ ] Company settings accessible
[ ] Users list renders (sample: >3 users)
[ ] User detail shows role/tenant
[ ] Non-admin role sees restricted menus
[ ] Admin can update user roles
```

**Global Checks (all modules):**
```
[ ] No 404 errors in network tab
[ ] No JavaScript console errors
[ ] No 500-level server errors
[ ] Page load time <3s per view
[ ] Navigation smooth, no hangs
```

**Blocker Matrix:**  
- **Critical (NO-GO):** Auth fails, any 500 error, console JS errors
- **Major (GO with caution):** Slow loads (>3s), data blanks, missing features
- **Minor:** UI polish, animation glitches

**Evidence:**
- Screenshot of each module
- Console error log (`F12 → Console → Right-click → Save as`)
- Network HAR file (DevTools → Network → Right-click → Save all as HAR with content)

---

### Phase E: Level 4 Audit - Security Matrix RBAC (90 mins)

**Owner:** Security QA  
**Setup:**
```powershell
# 1. Export tokens to environment
$env:USER_ADMIN_TENANT_A = $token_admin_a
$env:USER_MANAGER_TENANT_A = $token_manager_a
$env:USER_DISPATCHER_TENANT_A = $token_dispatcher_a
$env:USER_ACCOUNTANT_TENANT_A = $token_accountant_a
$env:USER_DRIVER_TENANT_A = $token_driver_a
$env:USER_VIEWER_TENANT_A = $token_viewer_a
$env:USER_ADMIN_TENANT_B = $token_admin_b

# 2. Run automated test
npm run test:security-matrix
```

**Test Case Execution Matrix:**

All 20 cases from [PROGRAM_A_SECURITY_TEST_MATRIX_20260329.md](PROGRAM_A_SECURITY_TEST_MATRIX_20260329.md):

| Case | Op | Actor | Target Tenant | Expected | Status | Notes |
|------|----|----|---|---|---|---|
| A-001 | vehicles/read | viewer_a | tenant_a | ALLOW | [ ] | |
| A-002 | vehicles/read | viewer_a | tenant_b | DENY | [ ] | cross-tenant block |
| A-003 | vehicles/create | dispatcher_a | tenant_a | ALLOW | [ ] | |
| A-004 | vehicles/create | dispatcher_a | tenant_b | DENY | [ ] | tenant spoof prevention |
| A-005 | drivers/read | manager_a | tenant_a | ALLOW | [ ] | |
| A-006 | drivers/update | driver_a | tenant_a | DENY | [ ] | role restriction |
| A-007 | routes/read | viewer_a | tenant_a | ALLOW | [ ] | |
| A-008 | customers/read | accountant_a | tenant_a | ALLOW | [ ] | |
| A-009 | trips/create | dispatcher_a | tenant_a | ALLOW | [ ] | |
| A-010 | trips/update | driver_a | tenant_a | DENY | [ ] | workflow restriction |
| A-011 | expenses/create | accountant_a | tenant_a | ALLOW | [ ] | |
| A-012 | expenses/delete | accountant_a | tenant_a | DENY | [ ] | policy restriction |
| A-013 | maintenance/read | manager_a | tenant_a | ALLOW | [ ] | |
| A-014 | maintenance/update | driver_a | tenant_a | DENY | [ ] | role restriction |
| A-015 | users/read-self | driver_a | uid_self | ALLOW | [ ] | own data |
| A-016 | users/read-other | driver_a | uid_other_a | DENY | [ ] | privacy |
| A-017 | users/update-role | admin_a | tenant_a | ALLOW | [ ] | admin privilege |
| A-018 | users/update-role | manager_a | tenant_a | DENY | [ ] | escalation blocked |
| A-019 | users/create | admin_a | tenant_b | DENY | [ ] | cross-tenant |
| A-020 | trips/read | admin_a | tenant_b | DENY | [ ] | strict isolation |

**Pass Criteria:**
- **DENY cases (A-002, A-004, A-006, A-010, A-012, A-014, A-016, A-018, A-019, A-020):** ALL must fail (return 403/permission denied)
- **ALLOW cases (A-001, A-003, A-005, A-007, A-008, A-009, A-011, A-013, A-015, A-017):** ALL must succeed
- **Coverage:** 100% (20/20 cases executed)
- **Failure rate:** 0% (no unexpected results)

**Blocker (Hard NO-GO):**  
Any ALLOW case failing as DENY or DENY case succeeding as ALLOW = **Security violation → HALT**

---

## PART 4: GO/NO-GO DECISION GATE

### Decision Criteria

| Result | Level 1 | Level 2 | Level 3 | Level 4 | Overall |
|--------|---------|---------|---------|---------|---------|
| **GO** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | **READY** |
| **GO w/ caution** | ✅ PASS | ✅ PASS | ⚠️ Minor issues | ✅ PASS | Acceptable |
| **NO-GO** | ✅ PASS | ⚠️ Major issues | ANY | ANY | **BLOCK** |
| **NO-GO** | ✅ PASS | ✅ PASS | ANY | ❌ FAIL | **BLOCK** |

### Sign-Off Template

```markdown
# GO/NO-GO Decision Log

**Date:** 2026-03-30  
**App:** FleetPro V1  
**Environment:** Production (Cloudflare Pages)  
**Overall Decision:** ☐ GO | ☐ GO WITH CAUTION | ☐ NO-GO

## Results Summary
- Level 1 Health Check: ✅ PASS | ⚠️ PASS w/ warnings | ❌ FAIL
- Level 2 Release Gate: ✅ PASS | ⚠️ PASS w/ warnings | ❌ FAIL
- Level 3 Full Smoke: ✅ PASS | ⚠️ PASS w/ warnings | ❌ FAIL
- Level 4 RBAC Matrix: ✅ PASS (20/20) | ⚠️ PASS (19/20) | ❌ FAIL

## Blocking Issues
- [ ] None
- [ ] Issue #1: _____
- [ ] Issue #2: _____

## Approvers
- [ ] QA Lead: _________________ Date: _____
- [ ] Backend Owner: __________ Date: _____
- [ ] DevOps/Release Owner: __ Date: _____

## Next Steps
- GO: Deploy to production immediately
- GO w/ caution: Deploy with monitoring hotline active
- NO-GO: Return to Phase A, fix blockers, restart audit
```

---

## PART 5: AUDIT TOOLS & COMMANDS (REFERENCE)

### Quick Health Check (1 min)
```powershell
node scripts/online-health-check.js --endpoint https://fleetpro-app.pages.dev
```

### Full Release Gate (5 mins)
```powershell
node scripts/online-release-gate.js `
  --webapp https://fleetpro-app.pages.dev `
  --tenant-a internal-tenant-1 `
  --tenant-b internal-tenant-2 `
  --log audit-run-$(Get-Date -Format 'yyyyMMdd-HHmmss').log
```

### Object/Tab Audit (5 mins)
```powershell
node scripts/qa-object-tab-audit.js `
  --webapp-a https://fleetpro-app.pages.dev `
  --tenant-a internal-tenant-1
```

### Full Automated Smoke (10 mins)
```powershell
./scripts/qa-full-check.ps1 -Environment production
```

### One-Command Audit Orchestration
```powershell
./scripts/run-audit-gates.ps1 `
  -Endpoint https://fleetpro-app.pages.dev `
  -Level 4 `
  -Output ./audit-artifacts/ `
  -Verbose
```

### Security Matrix (Manual for now)
```powershell
# Export all tokens
$tokens = @{
  'USER_ADMIN_TENANT_A' = 'xxx'
  'USER_MANAGER_TENANT_A' = 'xxx'
  # ... etc
}

$tokens.GetEnumerator() | ForEach-Object {
  [Environment]::SetEnvironmentVariable($_.Key, $_.Value)
}

npm run test:security-matrix --reporter json > security-results.json
```

---

## PART 6: PRODUCTION ISSUE PLAYBOOK (POST-GO)

### If Production Issue Reported

1. **Immediate (0-5 mins)**
   ```
   [ ] Scale down deployment (if outage)
   [ ] Enable emergency maintenance page
   [ ] Gather error logs
   ```

2. **Triage (5-15 mins)**
   ```
   [ ] Reproduce issue using Level 1-3 checklist
   [ ] Identify affected module/role
   [ ] Check Firestore quota/limits
   [ ] Verify apps script runtime limits
   ```

3. **Escalation**
   - Auth issue → Backend team
   - Data issue → Firestore/security rules
   - UI issue → Frontend team

4. **Rollback Decision**
   ```
   If: Blocker + Can't fix in <30 mins
   Then: Initiate rollback to previous commit
   ```

---

## PART 7: AUDIT SCHEDULE & CADENCE

### Mandatory Audit Gates

1. **Every Deploy** → Level 1 + Level 2 (auto-gate pre-deploy)
2. **Weekly** → Level 3 full smoke (prod validation)
3. **Monthly** → Level 4 security matrix (compliance)
4. **Pre-Release** → All Levels 1-4 (2-day sign-off)

### Audit Run Log
```
Date          Trigger        Level  Result  Owner      Duration  Evidence Path
2026-03-30   Fix blockers    1-2    TBD     QA Lead    30min     audit-run-2026-03-30/
2026-03-30   Full smoke      3      TBD     QA Tester  60min     audit-run-2026-03-30/
2026-03-31   RBAC matrix     4      TBD     Sec QA     90min     audit-run-2026-03-31/
```

---

## SUMMARY & NEXT ACTIONS

### As Senior QA (20 years experience), I recommend:

**Immediate (Today - 2026-03-30):**
1. ✅ Assign 4 blocking issues to owners (Backend, DevOps, QA)
2. ✅ Deploy fixes to Apps Script (tenant fallback + auth handlers)
3. ✅ Verify Tenant B in Firestore
4. ✅ Populate test token vault

**Tomorrow (2026-03-31):**
1. ✅ Execute Level 1-2 audit gates (should PASS)
2. ✅ Run Level 3 full smoke (manual testing)
3. ✅ Execute Level 4 security matrix
4. ✅ Obtain sign-offs from QA, Backend, DevOps

**Production Release:**
1. ✅ Publish to Cloudflare Pages (branch: release/cloudflare-20260329)
2. ✅ Monitor first 24h for production issues
3. ✅ Weekly smoke audits thereafter

---

**Document Owner:** Senior QA Architect  
**Last Updated:** 2026-03-30  
**Version:** 1.0 - Production Ready
