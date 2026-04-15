# QA Audit Checklist - Pre-GitHub Push

## ✅ 1. Build & Syntax Check
```bash
npm run build
# ✓ No errors
# ✓ No critical warnings
# ✓ All chunks generated
```

## ✅ 2. Linting Check
```bash
npm run lint
# ✓ No eslint errors
# ✓ No TypeScript errors
```

## ✅ 3. Local Dev Server Test
```bash
npm run dev
# Browser: http://localhost:5173
```

### 3A. Authentication Flow ✓
- [ ] Login page loads (no 404)
- [ ] Demo accounts accessible
- [ ] Redirect after login works

### 3B. Main Dashboard ✓
- [ ] Dashboard loads (grid, cards visible)
- [ ] Vehicles page loads
- [ ] Drivers page loads with data
- [ ] Routes page loads
- [ ] Trips page loads

### 3C. Driver Mobile Menu (NEW) ✓
- [ ] Bottom nav shows 4 tabs (Việc Hôm Nay, Lịch Sử, Báo Cáo, Cá Nhân)
- [ ] Login taixedemo@tnc.io.vn → Demo@1234
- [ ] Click "Báo Cáo" tab (3rd tab from left)
- [ ] List of trips displays
- [ ] Click trip → Dialog opens with 4-tab menu:
  - [ ] Tab 1: Check-in form displays (radio buttons + fuel/odometer inputs)
  - [ ] Tab 2: Camera/GPS check-in form displays
  - [ ] Tab 3: Document upload form displays
  - [ ] Tab 4: End-of-trip form displays
- [ ] Auto-progression through tabs works

### 3D. Broadcast Network Test ✓
- [ ] No 404 errors on any route
- [ ] All lazy-loaded components load
- [ ] No console errors (F12 → Console tab)
- [ ] Redirect rules work (e.g., /sales → /)

### 3E. Demo Data
- [ ] 25 drivers loaded with addresses
- [ ] TX0001 has 3+ trips assigned
- [ ] All drivers show health_check_expiry

## ✅ 4. Network Tab Check
```
F12 → Network → Reload
- [ ] index.html: 200 OK, <5KB
- [ ] Main JS chunks: 200 OK
- [ ] CSS: 200 OK
- [ ] Firebase calls work (no 401/403)
```

## ✅ 5. Console Tab Check
```
F12 → Console
- [ ] No red errors
- [ ] No broken imports
- [ ] No Firebase auth errors
- [ ] Warnings only if acceptable
```

## ✅ 6. Mobile Responsive Test
```bash
F12 → Toggle device toolbar (Ctrl+Shift+M)
- [ ] Layout: iPhone 12 (390x844)
- [ ] Bottom nav visible & clickable
- [ ] Forms responsive on small screen
- [ ] Camera input works (allow permission)
```

## ✅ 7. Git Pre-Push Verification
```bash
# Check uncommitted changes
git status
# Should be clean

# Check branch
git branch
# Should be 'main'

# Check remote
git remote -v
# Should show 'origin'

# Verify commit message
git log -1 --oneline
# Should be descriptive
```

## ✅ 8. Production Build Preview
```bash
npm run build
cd dist
npx serve -s . -l 3000
# Browser: http://localhost:3000
# Verify static serving works (SPA routing)
```

## 📋 Test Scenarios

### Scenario A: Driver Complete Workflow
```
1. Login: taixedemo@tnc.io.vn / Demo@1234
2. See dashboard with 2-3 trips
3. Click "Báo Cáo" → Select first trip
4. Tab 1: Fill pre-trip (oil=ok, tires=ok, fuel=100, odometer=50000)
5. Tab 2: Capture check-in photo (allow camera)
6. Tab 3: Upload a test document
7. Tab 4: Fill post-trip (odometer=50050, fuel=95)
8. Verify no errors in console
```

### Scenario B: Mobile Routing Tests
```
- /auth → Login page ✓
- / → Dashboard (after login) ✓
- /drivers → Drivers list ✓
- /driver → Driver mobile port ✓
- /driver/menu → Driver menu (NEW) ✓
- /invalid → NotFound page ✓
```

### Scenario C: Data Loading
```
- Drivers page → See 25 drivers with addresses ✓
- Trips page → See trips with revenue data ✓
- TX0001 trips → See 3 demo trips ✓
- Health expiry visible in drivers table ✓
```

## 🚀 Pre-Push Checklist

```bash
# 1. Build pass?
npm run build && echo "✅ BUILD OK"

# 2. No console errors?
# (Manual: F12 → refresh, check console)

# 3. Demo data loads?
# (Manual: Login & check drivers/trips)

# 4. Mobile menu works?
# (Manual: /driver/menu → test 4 tabs)

# 5. Routes resolve?
# (Manual: try /drivers, /vehicles, /invalid, etc)

# 6. Git clean?
git status
# Should show: "nothing to commit, working tree clean"

# 7. Ready to push
git push origin main
```

## ❌ Common Issues & Fixes

| Issue | Check | Fix |
|-------|-------|-----|
| 404 on lazy route | F12 Network tab | Rebuild: `npm run build` |
| Demo data empty | Firestore rules | Load from TENANT_DEMO_SEED in memory |
| Camera not working | Browser console | Allow camera permission + HTTPS |
| Chunks too large | Build output | Check vite.config.ts chunking |
| SPA routing broken | Production build | Verify _redirects / vercel.json config |

---

**Track Result:**
- [ ] All checks PASS → Ready to push ✅
- [ ] Issues found → Fix & re-run checks

**Date:** 2026-04-02
**Version:** Commit 8334479 (Driver Menu v1)
