# 🎯 FleetPro Demo Setup Guide - 4 Full-Access Accounts

## Overview

Your FleetPro application now includes **4 pre-configured demo accounts** with:
- ✅ Complete feature access (NO RESTRICTIONS)
- ✅ Unlimited vehicles, drivers, trips, storage
- ✅ All 4 job roles covered (Admin, Dispatcher, Driver, Accountant)
- ✅ Ready for immediate user testing

---

## 📋 The 4 Demo Accounts

### 1️⃣ Admin - Full System Access
```
Email:    admin@demo.tnc.io.vn
Password: Demo@2024123
Role:     Administrator
Tenant:   demo-tenant-tnc-001
Access:   UNLIMITED - Everything
```

**Can Do:**
- Create/edit/delete users & teams
- Configure billing & subscription plans
- Manage system settings & security
- View audit logs & analytics
- Create unlimited vehicles & drivers
- Access all admin features

**Best For:** System configuration, testing admin panel

---

### 2️⃣ Dispatcher - Dispatch & Monitoring
```
Email:    dispatcher@demo.tnc.io.vn
Password: Demo@2024123
Role:     Dispatcher
Tenant:   demo-tenant-tnc-001
Access:   UNLIMITED - Dispatch Everything
```

**Can Do:**
- Create & assign trips
- Assign drivers to vehicles
- Monitor real-time tracking
- Manage incidents & exceptions
- View dispatch reports
- Coordinate operations

**Best For:** Testing dispatch workflow, real-time tracking

---

### 3️⃣ Driver - Mobile App Features
```
Email:    driver@demo.tnc.io.vn
Password: Demo@2024123
Role:     Driver
Tenant:   demo-tenant-tnc-001
Access:   UNLIMITED - Driver Features
```

**Can Do:**
- Pre-trip vehicle inspection ✅
- Live GPS tracking
- Location check-in
- Media capture (📸 📹 🎙️)
- Document upload
- Post-trip reporting
- Trip tracking & navigation

**Best For:** Testing driver mobile app, 4-step workflow

---

### 4️⃣ Accountant - Finance & Reconciliation
```
Email:    accountant@demo.tnc.io.vn
Password: Demo@2024123
Role:     Accountant
Tenant:   demo-tenant-tnc-001
Access:   UNLIMITED - Finance Everything
```

**Can Do:**
- Reconcile completed trips
- Manage invoices
- Analyze costs & expenses
- Generate financial reports
- Track fuel consumption
- View audit logs

**Best For:** Testing finance workflow, cost analysis

---

## 🚀 Quick Start Test Flow

### Complete 45-Minute Demo Experience

#### Phase 1: Admin Setup (10 min)
```bash
# 1. Login as admin
Email: admin@demo.tnc.io.vn
Password: Demo@2024123
URL: http://localhost:5173

# 2. Create 5 test vehicles
- Vehicle 1: XE001 (Van 16 seats)
- Vehicle 2: XE002 (Truck 5 tons)
- Vehicle 3: XE003 (Car 4 seats)
- Vehicle 4: XE004 (Motorbike)
- Vehicle 5: XE005 (Bus 45 seats)

# 3. Verify unlimited vehicle creation (no quota warning)
```

#### Phase 2: Dispatch Operations (10 min)
```bash
# 1. Login as dispatcher
Email: dispatcher@demo.tnc.io.vn
Password: Demo@2024123
URL: http://localhost:5173/dispatch

# 2. Create 3 trips
- Trip 1: Ho Chi Minh → Bien Hoa (150 km)
- Trip 2: Ho Chi Minh → Phu Quoc (300 km)
- Trip 3: Ho Chi Minh → Vung Tau (100 km)

# 3. Assign drivers & vehicles
# 4. Monitor real-time tracking
# 5. Verify no trip limits
```

#### Phase 3: Driver Mobile Experience (15 min)
```bash
# 1. Login as driver
Email: driver@demo.tnc.io.vn
Password: Demo@2024123
URL: http://localhost:5173/driver/menu

# 2. STEP 1: Pre-Trip Inspection (5 min)
- Check engine oil ✓
- Check coolant ✓
- Check tires ✓
- Check lights ✓
- Check brakes ✓
- Record fuel level: 85%
- Record odometer: 120,500 km
- Save report

# 3. STEP 2: Active Tracking (when trip starts)
- View live GPS map
- Capture incident photo (📸 Camera)
- Record video evidence (🎥 Video)
- Record voice note (🎙️ Audio)

# 4. STEP 3: Media Documentation
- Review all captured media
- Add descriptions to photos/videos
- Confirm media ready

# 5. STEP 4: Post-Trip Report
- Final vehicle condition check
- Record final fuel: 62%
- Record final odometer: 120,585 km
- Add completion notes
- SUBMIT trip

✅ Trip completed successfully!
```

#### Phase 4: Finance Review (10 min)
```bash
# 1. Login as accountant
Email: accountant@demo.tnc.io.vn
Password: Demo@2024123
URL: http://localhost:5173/accounting

# 2. View completed trips
# 3. Reconcile trip data
# 4. Verify fuel consumption (23% = 2.3L)
# 5. Confirm trip cost calculation
# 6. Generate sample report
```

---

## 🔑 Key Features to Test

### ✅ With These Demo Accounts You Can Test:

**Media Capture** (New)
- 📸 Camera: Real device camera photo capture
- 🎥 Video: Up to 5 minutes recording
- 🎙️ Audio: Up to 10 minutes with waveform

**Pricing System** (New)
- Trial: 5 days, unlimited vehicles
- Professional: 567k/month, max 50 vehicles
- Business: Custom, unlimited vehicles + white label

**Vehicle Quotas** (New)
- Trial: Unlimited (no warnings)
- Professional: Max 50 (warnings if exceeded)
- Business: Unlimited (no restrictions)

**4-Step Trip Workflow**
- Step 1: Pre-trip inspection form
- Step 2: Active tracking with media capture
- Step 3: Media documentation
- Step 4: Post-trip report

**Unlimited Access**
- Create unlimited vehicles ✅
- Create unlimited drivers ✅
- Create unlimited trips ✅
- Upload unlimited media ✅
- No trial countdown ✅
- No quota restrictions ✅
- No feature limitations ✅

---

## 📱 Mobile Testing (Driver App)

### Test on Mobile Device or Browser DevTools

1. **Open DevTools** (F12)
2. **Toggle Device Toolbar** (Ctrl+Shift+M)
3. **Login as driver@demo.tnc.io.vn**
4. **Navigate to `/driver/menu`**
5. **Test 4-step workflow on mobile**

### Expected Mobile Experience:
- Tab navigation at bottom (1/4, 2/4, 3/4, 4/4)
- Form fields adapted to mobile width
- Camera access (allow permissions)
- Video preview before upload
- Audio waveform animation
- Touch-friendly buttons & forms

---

## 🧪 Testing Checklist

### Admin Features
- [ ] Login with admin account
- [ ] Create 5+ vehicles
- [ ] Create 3+ drivers
- [ ] View system audit logs
- [ ] Change admin settings
- [ ] No quota warnings/errors

### Dispatcher Features
- [ ] Login with dispatcher account
- [ ] Create 3+ trips
- [ ] Assign drivers to trips
- [ ] View real-time tracking map
- [ ] Monitor trip progress
- [ ] No trip limits

### Driver Features (Mobile)
- [ ] Login with driver account
- [ ] Navigate to /driver/menu
- [ ] **Pre-trip**: Complete inspection form
- [ ] **Active**: Start trip, capture media
  - [ ] 📸 Camera photo capture
  - [ ] 🎥 Video recording (3-5 sec)
  - [ ] 🎙️ Audio record (5-10 sec)
- [ ] **Media**: Add descriptions to captures
- [ ] **Post-trip**: Complete final report
- [ ] Trip submission successful
- [ ] No quota restrictions

### Accountant Features
- [ ] Login with accountant account
- [ ] View completed trips
- [ ] Reconcile trip data
- [ ] Analyze fuel consumption
- [ ] Generate reports
- [ ] View financial data

### Pricing/Quotas (Everywhere)
- [ ] Trial accounts see 3 pricing tiers ✅
- [ ] Professional shows "Max 50 vehicles" ✅
- [ ] Business shows "Unlimited" ✅
- [ ] No trial countdown shown ✅
- [ ] No quota warnings with unlimited ✅

### Build Verification
- [ ] All TypeScript types OK
- [ ] No console errors
- [ ] 📸 CameraCapture component works
- [ ] 🎥 VideoRecorder component works
- [ ] 🎙️ AudioRecorder component works
- [ ] Payments buttons visible (PayPal/MoMo)
- [ ] Map displays correctly (not fullscreen)

---

## 🔐 Security Notes

⚠️ **Important:**
- These are DEMO accounts only
- DO NOT deploy with these credentials in production
- Change passwords for production use
- These accounts have unrestricted access
- Audit logs will mark as demo=true
- For real users, implement quota limits

✅ **Good for:**
- Internal testing
- User acceptance testing (UAT)
- Demo to stakeholders
- Training & onboarding
- Feature validation

---

## 🛠️ Troubleshooting

### Can't Login?
```bash
# Check Firebase connection
# Verify service account file exists
# Check browser console for errors
# Clear cache and cookies
```

### Features Not Available?
```bash
# Verify user role in Firestore
# Check custom claims: demo=true, unlimited=true
# Verify tenant_id matches: demo-tenant-tnc-001
# Check browser console for auth errors
```

### Media Capture Not Working?
```bash
# Allow camera/mic permissions
# Check browser console for getUserMedia errors
# Verify https or localhost (required for media)
# Try different browser if one fails
```

### Quota Still Shows Limit?
```bash
# Verify quotas set to -1 in Firestore
# Check PaywallGuard component logic
# Verify unlimited flag = true in user doc
# Clear app cache and reload
```

---

## 📊 Demo Data Structure

```
Firestore:
tenants/
  └── demo-tenant-tnc-001/
      ├── users/
      │   ├── hydxagaPWcef0XAMErBGSxNflzU2 (admin)
      │   ├── xqR0jyNCRodBHCZYjWhtsrINf122 (dispatcher)
      │   ├── RJE1supQe3SbwtacjAjjTJvkvWl2 (driver)
      │   └── DN2W7m4cpLeQ6nB75tzxE4hRcSv1 (accountant)
      ├── vehicles/
      │   ├── XE001, XE002, ... (unlimited)
      ├── drivers/
      │   ├── DRV001, DRV002, ... (unlimited)
      └── trips/
          └── T001, T002, ... (unlimited)

Firebase Auth:
├── admin@demo.tnc.io.vn
├── dispatcher@demo.tnc.io.vn
├── driver@demo.tnc.io.vn
└── accountant@demo.tnc.io.vn
```

---

## 🚀 Setup Command

To recreate demo accounts at any time:

```bash
# From project root:
npm run seed:demo-accounts

# This will:
# 1. Create 4 Firebase Auth users
# 2. Set custom claims with demo=true, unlimited=true
# 3. Create Firestore user documents
# 4. Set quotas to -1 (unlimited)
# 5. Generate DEMO_CREDENTIALS.md file
```

---

## 📈 Next Steps

1. ✅ **Test Each Role**
   - Admin: System setup
   - Dispatcher: Trip creation
   - Driver: 4-step workflow
   - Accountant: Reconciliation

2. ✅ **Test All Media Features**
   - Camera capture
   - Video recording
   - Audio recording
   - Media upload to Firebase

3. ✅ **Test Pricing Display**
   - 3 pricing tiers visible
   - PayPal button functional
   - MoMo payment button visible
   - No trial countdown

4. ✅ **Test Quotas**
   - Create 100+ vehicles (should work)
   - No quota warning on trial
   - Professional shows 50-vehicle limit
   - Business shows unlimited

5. ✅ **Performance Check**
   - Page load < 3 seconds
   - No console errors
   - Media captures efficiently
   - Reports generate quickly

6. ✅ **Prepare for Production**
   - Remove demo accounts
   - Set real quotas per plan
   - Enable trial countdown
   - Configure payment processing

---

## 📞 Support

**Issue:** Accounts not created  
**Solution:** Check service account permissions, retry with `npm run seed:demo-accounts`

**Issue:** Features unavailable  
**Solution:** Verify user document in Firestore has unlimited=true

**Issue:** Quotas still enforced  
**Solution:** Check PaywallGuard component, ensure quotas=-1

**Issue:** Media not uploading  
**Solution:** Check Firebase Storage rules, verify permissions

---

**Created:** 2026-04-04  
**Demo Tenant:** demo-tenant-tnc-001  
**Status:** ✅ Ready for Production Demo  
**Accounts:** 4/4 Active  
**Access Level:** UNLIMITED

🎉 **Your demo is ready! Start testing now!**
