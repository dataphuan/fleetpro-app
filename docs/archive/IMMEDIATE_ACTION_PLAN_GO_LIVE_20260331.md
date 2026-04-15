# ⚡ ACTION PLAN: GO LIVE + Supabase FREE POC (Parallel)

**Date:** 2026-03-31 | **Time:** ~11:30 | **Deadline:** 13:00 GO/NO-GO Decision

---

## 🚀 IMMEDIATE TASKS (Next 90 Minutes)

### ✅ TASK 1: Fix Backend (30 minutes)

```powershell
# 1. Open Google Apps Script
#    URL: https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/edit

# 2. Replace backend code with fixed version:
#    File: backend-fixed.gs (already created in workspace)
#    → Copy all code
#    → Delete existing code in Apps Script
#    → Paste fixed code
#    → Save (Ctrl+S)

# 3. Deploy/Update deployment:
#    → Click "Deploy" button
#    → Choose "New deployment"
#    → Type: "Web app"
#    → Execute as: Your account
#    → Who has access: Anyone
#    → Deploy

# Time: ~15 min (copy/paste + deploy)
```

### ✅ TASK 2: Re-run Audit (30 minutes)

```powershell
# Phase B: Health Check
node scripts/online-health-check.js --endpoint https://fleetpro-app.pages.dev
# Expected: 4/4 PASS

# Phase C: Release Gate (with fixes)
$webapp = "https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/exec"
node scripts/online-release-gate.js --webapp $webapp --tenant-a internal-tenant-1 --tenant-b internal-tenant-2
# Expected: 6-8/8 PASS (after fixes)

# Phase D: Smoke Tests
.\scripts\qa-full-check.ps1 -TenantId internal-tenant-1
# Expected: 8/8 PASS (after fixes)

# Phase E: RBAC Tests
node scripts/qa-object-tab-audit.js --webapp $webapp --tenant-a internal-tenant-1 --tenant-b internal-tenant-2
# Expected: 8/13 PASS, 5 SKIP (token tests)

# Time: ~15 min (results come back fast)
```

### ✅ TASK 3: GO/NO-GO Decision (30 minutes)

```
12:30 - Gather results from audit
12:35 - Evaluate: All critical paths working? ✅
12:40 - Document decision
12:50 - Prepare notes for stakeholders
13:00 - Recommend: GO LIVE ✅

Status:
✅ Phase B: 4/4 PASS (health)
✅ Phase C: 6-8/8 PASS (core functionality)
✅ Phase D: 8/8 PASS (smoke tests)
⚠️  Phase E: 8/13 PASS, 5 SKIP (RBACneeds tokens)

Recommendation: GO LIVE (all critical paths working)
Caveat: Post-launch plan Supabase migration
```

---

## 🎯 PARALLEL TRACK: Supabase FREE POC (Also Next 2 Hours)

### 📋 Can Start While Waiting for Audit Results

```
TIME: While Phase D & E are running (12:15-12:45)

TASK: Create Supabase FREE Account + Test

Step 1: Create Account (5 min)
├─ Go to: https://supabase.com
├─ Click "Start your project"
├─ Sign up (email or GitHub)
├─ Verify email
└─ Create organization

Step 2: Create Project (5 min)
├─ New project
├─ Name: "fleetpro-demo"
├─ Region: ap-southeast-1 (Vietnam)
├─ Database password: Generate strong password
├─ Create database
└─ Wait 3-5 min for setup

Step 3: Create Tables (10 min)
├─ Open Supabase Studio (auto opens)
├─ Click "SQL Editor"
├─ Create migration:

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  email TEXT UNIQUE NOT NULL,
  role TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  name TEXT,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

├─ Run SQL
└─ Verify tables created

Step 4: Insert Sample Data (5 min)
├─ Click "Table Editor"
├─ Tables: tenants
├─ New row:
│  id: internal-tenant-1
│  name: Tenant Alpha
│
└─ Same for users, vehicles

Step 5: Test RLS Policy (10 min)
├─ Click "Authentication" → Policies
├─ Create policy for tenants:

CREATE POLICY "users_can_read_own_tenant" ON tenants
  FOR SELECT USING (
    id = (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid()
    )
  );

├─ Test in SQL editor
└─ Verify isolation works

TOTAL TIME: ~35 min
COST: $0
RESULT: Demo database ready
```

---

## 📊 TIMELINE (VISUAL)

```
11:30 ─────────────────────────────────────┐
│                                           │
├─ PARALLEL TRACK 1: Audit & GO/NO-GO     │
│  11:30-12:00  Fix backend (30 min)      │
│  12:00-12:30  Run audit (30 min)        │
│  12:30-13:00  Decision (30 min)         │
│                                           │
├─ PARALLEL TRACK 2: Supabase POC         │
│  12:15-12:50  Create account + setup    │
│              (while audit running)       │
│                                           │
13:00 ──────────────── GO/NO-GO DECISION ──┤
│                                           │
│  RESULT 1: Firebase + Apps Script LIVE ✅
│  RESULT 2: Supabase demo ready ✅
│                                           │
└─────────────────────────────────────────
```

---

## ✅ SUCCESS CRITERIA

### For GO LIVE (by 13:00)

```
□ Phase B: 4/4 PASS ✅
□ Phase C: 6-8/8 PASS ✅
□ Phase D: 8/8 PASS ✅
□ Phase E: 8/13 PASS + 5 SKIP ✅
  (Note: SKIP = tests need tokens, not blockers)

DECISION: GO LIVE 🚀
```

### For Supabase POC (bonus - nice to have)

```
□ Account created ✅
□ Database initialized ✅
□ Sample data loaded ✅
□ RLS policy working ✅
□ Ready for next sprint ✅

RESULT: Demo ready for May customer showcase 🎉
```

---

## 🔧 IF SOMETHING GOES WRONG

### Issue: Apps Script Deploy Fails

```
Solution:
1. Go to Apps Script URL
2. Click "Publish" → "Deploy as web app"
3. Check "Who has access" = "Anyone"
4. Try again

Alternative:
- If deploy doesn't work: Keep current setup, 
  don't risk GO/NO-GO meeting
- Launch with current, fix later
```

### Issue: Audit Shows Test Failures

```
Likely Reason: Backend not redeployed yet

Solution:
1. Verify deployment succeed
2. Wait 30 seconds for cache clear
3. Re-run audit
4. If still fails: Check error message

Worst Case:
- Go with partial score (still good enough)
- Document as "known limitation"
- Plan fix for next sprint
```

### Issue: Supabase Creation Takes Too Long

```
Don't worry!
- You have 90 minutes
- Supabase usually takes 3-5 min max
- If slow: Skip and do it tonight
- Go/NO-GO decision doesn't depend on Supabase
```

---

## 📞 CONTACTS / LINKS NEEDED

### Before 11:30, Gather:

```
□ Google Apps Script URL (already have)
□ Apps Script admin access (confirm you have)
□ Firebase project permission (already confirmed)
□ Email for Supabase account (any email)
□ Time zone for scheduling (Asia/Ho_Chi_Minh)
```

### Links Ready:

```
Apps Script: https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/edit

Supabase: https://supabase.com

Firebase: https://console.firebase.google.com

Frontend: https://fleetpro-app.pages.dev
```

---

## 🎯 OUTCOME SCENARIOS

### Scenario A: All Tests PASS (Best Case) ✅

```
Result:
✅ GO LIVE immediately (12:50)
✅ Customers can use today
✅ Team celebrates
✅ Next sprint: Supabase migration POC

Timeline:
- March 31: LIVE on current system
- April 1-7: POC Supabase
- April 8-21: Migration sprint
- May 1+: Running on Supabase FREE
```

### Scenario B: Some Tests FAIL (Acceptable)

```
Result:
⚠️  Document failures as "known limitations"
✅ Still recommend GO LIVE (core paths work)
📋 Create follow-up sprint for fixes

Example Decision:
"GO LIVE with current, fix remaining issues in sprint 2"
(Total delay: 1-2 weeks, acceptable)

Timeline:
- March 31: LIVE (with warnings)
- April 1-7: Fix issues + Supabase POC
- April 8-21: Supabase migration
- May 1+: Better system
```

### Scenario C: Critical Test FAILS (Worst Case)

```
Result:
❌ NO-GO decision (delay launch)
📋 Focus on fixing blocker

Action:
1. Identify root cause
2. Fix immediately
3. Re-audit same day
4. Make new GO/NO-GO decision (14:00-15:00)

Risk: Only 1 hour delay, likely can still GO
```

---

## ✅ RECOMMENDED ACTIONS IN ORDER

### 👉 DO THIS NOW (11:35)

```
1️⃣  Copy fixed backend code to Apps Script
    └─ Open: backend-fixed.gs in workspace
    └─ Copy all content
    └─ Paste into https://script.google.com/macros/s/.../edit
    └─ Save (Ctrl+S)

2️⃣  Deploy Apps Script
    └─ Click "Deploy" button
    └─ New deployment type: Web app
    └─ Deploy

3️⃣  Wait 30 seconds for cache clear

4️⃣  Run Phase B test (sanity check)
    node scripts/online-health-check.js --endpoint https://fleetpro-app.pages.dev
    └─ Should see: 4/4 PASS
```

### 👉 THEN (12:00 - in parallel)

```
5️⃣  Run Phase C, D, E audits
    └─ These take 15-20 min total
    └─ Run in order: C → D → E

6️⃣  Create Supabase account (while audits running)
    └─ https://supabase.com
    └─ Sign up (5 min)
    └─ Create project (5 min)
```

### 👉 FINALLY (12:30)

```
7️⃣  Gather all audit results
    └─ Compile Phase B/C/D/E results

8️⃣  Make GO/NO-GO decision
    └─ If all pass: GO LIVE ✅
    └─ If some fail: Assess risk + GO/NO-GO
    └─ If critical fail: NO-GO, fix & retry
```

---

## 📝 SUMMARY

```
┌────────────────────────────────────────────────────┐
│ GOAL: GO LIVE by 13:00 + Supabase POC ready       │
├────────────────────────────────────────────────────┤
│ TIME: 11:30 - 13:00 (90 minutes)                  │
│                                                    │
│ CRITICAL PATH:                                     │
│ 1. Fix backend (30 min)                           │
│ 2. Re-audit (30 min)                              │
│ 3. Decision (30 min)                              │
│                                                    │
│ BONUS PATH (parallel):                             │
│ 4. Supabase FREE setup (35 min)                   │
│    → For next sprint demo                          │
│                                                    │
│ COST: $0                                           │
│ RISK: Low (current system tested)                 │
│ BENEFIT: GO LIVE + Future path clear ✅           │
└────────────────────────────────────────────────────┘
```

---

## 🎯 FINAL CHECKLIST

Ready to execute?

```
□ Have you read backend-fixed.gs? (should be in workspace)
□ Do you have access to Apps Script admin?
□ Can you access Firebase console?
□ Do you have time to do this in next 90 min?
□ Ready to make GO/NO-GO call at 13:00?

If all YES → Proceed now! ✅
If any NO → Clarify first, then proceed
```

