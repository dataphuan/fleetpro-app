# 🚀 Local Testing Guide - Quick Start

> Hướng dẫn chạy ứng dụng trên máy local và chạy QA audit

## 1️⃣ Run QA Pre-Push Audit (Automated Checks)

```bash
npm run qa:pre-push
```

**What it checks:**
- ✅ Git status (clean working tree)
- ✅ Correct branch (main)
- ✅ Production build passes
- ✅ dist/ folder generated correctly
- ✅ All critical source files present
- ✅ Dependencies installed
- ✅ Environment configuration

**Expected Output:**
```
✅ ALL CHECKS PASSED!
✅ QA Audit Complete! You're ready to push.
```

---

## 2️⃣ Start Development Server

```bash
npm run dev
```

**What you'll see:**
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Local URL:** Open `http://localhost:5173` in your browser

---

## 3️⃣ Test Demo Accounts in Browser

Login with any of these demo accounts:

### Account 1️⃣: Admin
- **Email:** `admin@tnc.io.vn`
- **Password:** `Admin@1234`
- **Role:** Admin
- **Access:** Full system admin panel

### Account 2️⃣: Branch Manager  
- **Email:** `manager@tnc.io.vn`
- **Password:** `Manager@1234`
- **Role:** Branch Manager
- **Access:** Branch dashboard, reports

### Account 3️⃣: Accountant
- **Email:** `accountant@tnc.io.vn`
- **Password:** `Accountant@1234`
- **Role:** Accountant
- **Access:** Financial reports, invoicing

### Account 4️⃣: Driver ⭐ (Test New Mobile Menu)
- **Email:** `taixedemo@tnc.io.vn`
- **Password:** `Demo@1234`
- **Role:** Driver TX0001
- **Access:** **Mobile driver menu with 4 new tabs**

---

## 4️⃣ Test Mobile Driver Menu (Most Important!)

### Step-by-Step Test for Driver Account:

1. **Login as Driver:**
   - Username: `taixedemo@tnc.io.vn`
   - Password: `Demo@1234`
   - ✅ Should see driver dashboard

2. **Open Mobile View:**
   - Press `F12` (DevTools) 
   - Click device toggle (📱 icon in top-left of DevTools)
   - Select **iPhone 12** (390 x 844)
   - ✅ UI should adjust to mobile size

3. **Navigate to Driver Menu:**
   - Look at bottom navigation bar
   - Click **"Báo Cáo"** tab (3rd button, orange icon)
   - ✅ Should see list of trips assigned to TX0001

4. **Open Mobile Driver Menu:**
   - Click on any trip in the list
   - Modal dialog should open with **4 tabs:**
     - Tab 1️⃣: **Kiểm Tra Trước Chuyến** (Pre-Trip Inspection)
     - Tab 2️⃣: **Check-In Vị Trí** (Location Check-In)
     - Tab 3️⃣: **Tải Tài Liệu** (Document Upload)
     - Tab 4️⃣: **Kiểm Tra Sau Chuyến** (Post-Trip Inspection)

5. **Test Each Tab:**

   **Tab 1️⃣ - Pre-Trip Inspection:**
   - Select status for: Oil, Coolant, Tires, Lights, Brakes
   - Enter Fuel % (0-100)
   - Enter Odometer (km)
   - ✅ Click "Tiếp Tục" → Progress shows 1️⃣/4

   **Tab 2️⃣ - Check-In Location:**
   - Allow camera permission (if prompted)
   - See live camera preview
   - Click "Chụp Ảnh" to capture photo
   - Auto-fill GPS coordinates
   - ✅ Click "Tiếp Tục" → Progress shows 2️⃣/4

   **Tab 3️⃣ - Document Upload:**
   - Select file (PDF/Image)
   - Add notes (optional)
   - Upload to Firebase Storage
   - ✅ Click "Tiếp Tục" → Progress shows 3️⃣/4

   **Tab 4️⃣ - Post-Trip Inspection:**
   - Same as Pre-Trip + additional "Damages" field
   - Document any damage/wear
   - ✅ Click "Hoàn Thành" → Complete

6. **Verify Success:**
   - ✅ All 4 tabs render without errors
   - ✅ Progress indicator updates (1️⃣/4 → 2️⃣/4 → 3️⃣/4 → 4️⃣/4)
   - ✅ Forms save data correctly
   - ✅ No console errors (F12 → Console tab)

---

## 5️⃣ Browser Console Checks

**Open DevTools:** Press `F12` → Go to **Console** tab

**Look for:**
- ❌ **RED errors:** Should see NONE (fatal)
- ⚠️ **Yellow warnings:** Ok if minor (can ignore)
- ℹ️ **Blue info:** Just informational (ok)

**Expected Safe Warnings:**
```
Circular chunk dependency: vendor chunk ...
Some chunks are larger than 2000 kB (acceptable for vendor)
```

**Critical - Should NOT See:**
```
❌ Failed to fetch dynamically imported module
❌ Uncaught error
❌ Cannot read properties of undefined
```

---

## 6️⃣ Network Tab Checks

**Press F12 → Network tab:**

1. **Refresh page** (Ctrl+R)
2. **Look for:**
   - ✅ `index.html` → Status 200 (green)
   - ✅ `index-*.js` → Status 200 (green)
   - ✅ Firebase SDK → Status 200 (green)
   - ❌ 404 errors (red) → FAIL if any

3. **Check Bundle Size:**
   - Open DevTools → Network → refresh
   - Sum up JS file sizes: 
     - Expected: ~200-400 KB total (gzipped)
     - ❌ If > 1MB gzipped → Performance issue

---

## 7️⃣ Test All 4 Demo Accounts (Quick Check)

Test that each account can login:

```bash
✅ Admin Account      → admin@tnc.io.vn
✅ Manager Account    → manager@tnc.io.vn  
✅ Accountant Account → accountant@tnc.io.vn
✅ Driver Account     → taixedemo@tnc.io.vn
```

**For each account:**
- [ ] Login succeeds
- [ ] Dashboard loads
- [ ] No auth errors in console
- [ ] Correct role permissions visible

---

## 8️⃣ Production Build Preview

```bash
npm run build
npm run preview
```

**Opens:** http://localhost:4173 (production build preview)

**Test:**
- ✅ All pages load
- ✅ Mobile menu works in production build
- ✅ No console errors
- ✅ Bundle is optimized

---

## 🔍 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot GET /` | Kill dev server, run `npm run dev` again |
| `Failed to fetch module` | Hard refresh Ctrl+Shift+R, clear cache |
| `Module not found` | Run `npm install`, rebuild with `npm run build` |
| `Firebase not loading` | Check `.env` has Firebase config |
| `Camera not working` | Check HTTPS or localhost (browser security) |
| `404 in Network tab` | DevTools → Network → look for red status codes |
| `Button unresponsive` | Check F12 Console for JS errors |

---

## ✅ Final Checklist Before Push

Before running `git push origin main`, verify:

- [ ] `npm run qa:pre-push` passes (all checks green)
- [ ] `npm run dev` starts without errors
- [ ] Can login with all 4 demo accounts
- [ ] Mobile driver menu visible (3rd tab = "Báo Cáo")
- [ ] All 4 tabs in mobile menu render
- [ ] Pre-trip form submits successfully
- [ ] Location check-in captures photo
- [ ] Document upload accepts files
- [ ] Post-trip form completes workflow
- [ ] No errors in F12 Console tab
- [ ] Network tab shows no 404s
- [ ] `npm run build` produces dist/ folder
- [ ] `npm run preview` shows production version correctly

---

## 🚀 Ready to Push!

Once all ✅ pass, you can safely push:

```bash
git push origin main
```

**Deployed! Your changes are now live.** 🎉

---

## 📞 Still Got Issues?

Check these files for configuration:
- `src/main.tsx` - App entry point
- `src/App.tsx` - Main routing
- `vite.config.ts` - Build configuration  
- `.env` - Firebase/environment variables
- `firebase.json` - Firebase deployment config

