# 🧪 COMPLETE DEMO TESTING GUIDE
**FleetPro V1 Online | April 2, 2026 | Test All Features**

---

## 🚀 Quick Start (5 Minutes)

### 1. Start Dev Server
```bash
npm run dev
```

You'll see:
```
➜  Local:   http://localhost:5177/      
➜  Network: http://192.168.1.196:5177/  
```

### 2. Open in Browser
```
http://localhost:5177/
```

You should see the **FleetPro login page** with:
- Email field
- Password field
- "Try Demo" button (future)
- "Create Account" link (future)

---

## 🎭 Test All 6 Demo Accounts

Copy each account and test login:

### Account 1: Driver (PRIMARY - Most Complete Features)
```
📧 Email:    taixedemo@tnc.io.vn
🔐 Password: Demo@1234
👤 Role:     Driver (TX0001)

Expected Features Visible:
✓ Dashboard with driver stats
✓ My Trips (list of 50 trips)
✓ Vehicle assignments (XE0001 - Hino 700)
✓ Pre-Trip Inspection form
✓ Location Check-In (GPS + photo)
✓ Document Upload
✓ Post-Trip Inspection
✓ Performance metrics
✓ Expense history
```

### Account 2: Manager
```
📧 Email:    demomanager@fleetpro.vn
🔐 Password: Demo@1234
👤 Role:     Manager

Expected Features:
✓ Dashboard with fleet overview
✓ Vehicles list (20 vehicles, status, health)
✓ Drivers list (25 drivers, performance)
✓ Routes management (15 routes)
✓ Trips dispatch board
✓ Revenue tracking
✓ Maintenance scheduling
✓ Driver performance report
✓ Vehicle utilization report
```

### Account 3: Accountant
```
📧 Email:    demoaccountant@fleetpro.vn
🔐 Password: Demo@1234
👤 Role:     Accountant

Expected Features:
✓ Dashboard with financial KPIs
✓ Expenses list (100+ items, filtered by category)
✓ P&L Statement (Revenue 45M - Cost 12.5M = Profit 32.5M)
✓ Vehicle Profitability Report (XE0001 leads with 5.2M profit)
✓ Driver Cost Analysis (fuel, labor per driver)
✓ Accounting Periods (3 months: Jan, Feb, Mar 2026)
✓ Invoice generation
✓ Tax report preview
```

### Account 4: Dispatcher
```
📧 Email:    demodispatcher@fleetpro.vn
🔐 Password: Demo@1234
👤 Role:     Dispatcher

Expected Features:
✓ Dispatch board (visual trip assignment)
✓ Available drivers list
✓ Available vehicles list
✓ Create new trip (3-click form)
✓ Assign driver to trip
✓ Assign vehicle to trip
✓ Real-time status updates
✓ Trip priority queue
```

### Account 5: Admin
```
📧 Email:    demoadmin@tnc.io.vn
🔐 Password: Demo@1234
👤 Role:     Admin

Expected Features:
✓ Dashboard (all data visible)
✓ Full access to all collections
✓ User management (see all 6 users)
✓ Company settings (TNC Vận Tải Logistics)
✓ System configuration
✓ Audit logs (see who did what, when)
✓ Tenant settings
✓ Feature flags
✓ All reports (financial, operations, analytics)
```

### Account 6: Viewer (Read-only)
```
📧 Email:    demoviewer@fleetpro.vn
🔐 Password: Demo@1234
👤 Role:     Viewer

Expected Features:
✓ Can view all dashboards
✓ Can view all reports
✓ Can export data
✗ Cannot create/edit/delete data
✗ Cannot manage users
✗ Cannot change settings
```

---

## 🧭 Feature Walkthrough by Section

### SECTION 1: Dashboard (2 min)
**URL:** `http://localhost:5177/` (After login)

**What You Should See:**
```
[Dashboard Header]
- Company Name: TNC Vận Tải Logistics
- Current Date: April 2, 2026
- User: [Your Role]

[KPI Cards]
┌─────────────────────────────────────┐
│ Total Vehicles: 20                  │ ← Click to filter active only (18)
│ Active Vehicles: 18                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Total Drivers: 25                   │ ← Click to see performance ranking
│ Active Drivers: 20                  │
│ On Leave: 5                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Trips (This Month): 50              │
│ Completed: 25                       │ ← 50% of month
│ In Progress: 5                      │
│ Pending: 20                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Revenue (Month): 45,000,000 VND     │ ← = 50 trips × avg 900k
│ Cost (Month): 12,500,000 VND        │ ← Fuel + Toll + Labor
│ Profit (Month): 32,500,000 VND      │ ← 72% margin!
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Fleet Health Score: 85/100          │ ← Safety + maintenance status
│ ⚠️  3 Alerts                        │ ← Insurance, License, Maintenance
└─────────────────────────────────────┘

[Quick Stats]
- Average Trip Revenue: 900,000₫
- Average Trip Cost: 250,000₫
- Average Profit per Trip: 650,000₫
- Profit Margin: 72%
```

**Test Actions:**
- [ ] Click on "Vehicles" card → Navigate to Vehicles section
- [ ] Click on "Drivers" card → Navigate to Drivers section
- [ ] Click on KPI numbers → Apply filter
- [ ] Click on alerts → See detail modal

---

### SECTION 2: Vehicles (2 min)
**URL:** `http://localhost:5177/vehicles` (or navigate from Dashboard)

**What You Should See:**
```
[Vehicle List Header]
Search: [_________________] Filter: [Active ▼] Sort: [Date ▼]

[Vehicle Cards - Grid View]
┌────────────────────────┐  ┌────────────────────────┐
│ XE0001                 │  │ XE0002                 │
│ Hino 700               │  │ Howo A7                │
│ License: 81G-1234      │  │ License: 81G-5678      │
│ Status: 🟢 Active      │  │ Status: 🟢 Active      │
│ Insurance: ✓ 90 days   │  │ Insurance: ✓ 120 days  │
│ Maint. Due: 500 km     │  │ Maint. Due: 800 km     │
│ [View Details]         │  │ [View Details]         │
└────────────────────────┘  └────────────────────────┘
... (repeats for all 20 vehicles)

Summary Cards:
┌─────────────────────────────────────┐
│ Active: 18 | Maintenance: 2 | Total: 20
└─────────────────────────────────────┘
```

**Test Actions:**
- [ ] Click on vehicle card → Show vehicle details modal
- [ ] In modal, see:
  - [ ] All trips for this vehicle (5-8 trips)
  - [ ] Total revenue from this vehicle (1.2M - 2.5M)
  - [ ] Total expenses (fuel, toll, maintenance)
  - [ ] Profit contribution
  - [ ] Average fuel consumption
  - [ ] Maintenance history
  - [ ] Insurance expiry date
- [ ] Click "Filter" → Show only active vehicles (18 of 20)
- [ ] Click "Export" → Download vehicles as Excel

---

### SECTION 3: Drivers (2 min)
**URL:** `http://localhost:5177/drivers`

**What You Should See:**
```
[Driver List]
Driver Name       License    Exp.    Health    Trips   Profit    Avg Score
───────────────────────────────────────────────────────────────────────────
TX0001 Trần Văn A  B123...    ✓       ✓        25     8.75M      ⭐⭐⭐⭐⭐
TX0002 Nguyễn Văn B B456...   ✓       ✓        18     6.2M       ⭐⭐⭐⭐⭐
TX0003 Phạm Thị C   B789...   ✓       ⚠️ 30d   12     4.5M       ⭐⭐⭐⭐
TX0004 Hoàng Văn D  B012...   ⚠️ 60d  ✓        8      2.1M       ⭐⭐⭐
TX0005 Lê Văn E     B345...   ✓       ✓        22     7.8M       ⭐⭐⭐⭐⭐
... (repeats for all 25 drivers)
```

**Test Actions:**
- [ ] Click on driver row → Show driver details
  - [ ] Personal info (name, license #, health date)
  - [ ] Performance metrics (total trips, profit, avg revenue per trip)
  - [ ] Recent trips (last 5)
  - [ ] Safety rating
  - [ ] Cost breakdown (avg fuel per trip, labor rate)
- [ ] See color-coded alerts:
  - [ ] 🟢 Green = Everything OK
  - [ ] 🟡 Yellow = License/health expiring (30-60 days)
  - [ ] 🔴 Red = License/health already expired
- [ ] Filter by status (Active, On Leave, Inactive)
- [ ] Sort by: Name, Trips, Profit, Score

---

### SECTION 4: Trips / Orders (3 min)
**URL:** `http://localhost:5177/trips`

**What You Should See:**
```
[Trip List - Kanban View or Table View]

Filter: [Status ▼] [Date Range ▼] [Driver ▼] [Vehicle ▼]

KANBAN COLUMNS:
┌─────────────────────────────────────┐
│ PENDING (20 trips)                  │
├─────────────────────────────────────┤
│ Trip-0045: HCM→VT (KH0001)           │
│ Driver: TX0003 | Vehicle: XE0005     │
│ Est. Revenue: 500k | Est. Cost: 150k │
│ Est. Profit: 350k                    │
│ [Assign] [Edit] [Delete]             │
├─────────────────────────────────────┤
│ Trip-0046: HCM→LA (KH0002)           │
│ ... (more trips) ...                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ IN PROGRESS (5 trips)                │
├─────────────────────────────────────┤
│ Trip-0040: HCM→BH (KH0003)           │
│ Driver: TX0001 | Vehicle: XE0001     │
│ Real Revenue: 520k | Real Cost: 160k │
│ Real Profit: 360k                    │
│ Started: 08:00 | ETA: 12:00          │
│ 🗺️  Live GPS: 10.8° N, 106.7° E      │
│ [Track] [Complete] [Edit]            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ COMPLETED (25 trips)                 │
├─────────────────────────────────────┤
│ Trip-0001: HCM→VT (KH0001)           │
│ Driver: TX0002 | Vehicle: XE0008     │
│ Revenue: 490k | Cost: 140k           │
│ Profit: 350k | Margin: 71%           │
│ Completed: Yesterday 16:30           │
│ [View] [Export PDF]                  │
└─────────────────────────────────────┘
```

**Test Actions:**
- [ ] Click trip card → See full trip details:
  - [ ] Trip code, date, time
  - [ ] Customer name and contact
  - [ ] Driver and vehicle assignments
  - [ ] Route (from → to location)
  - [ ] Cargo description
  - [ ] Revenue breakdown
  - [ ] Expense breakdown (fuel, toll, labor)
  - [ ] Profit margin %
  - [ ] Delivery proof (photo)
  - [ ] Driver notes
  - [ ] Action buttons (edit, complete, cancel, export)
- [ ] Filter by status: Pending, In Progress, Completed, Cancelled
- [ ] Filter by date range: Today, This Week, This Month, Custom
- [ ] Sort by: Date, Revenue, Profit, Driver, Vehicle
- [ ] Click "Export" → Download trips as Excel with financials

---

### SECTION 5: Expenses (2 min)
**URL:** `http://localhost:5177/expenses`

**What You Should See:**
```
[Expense List with Pie Chart]

[Pie Chart - Top Right]
Fuel: 48% (47.8M₫)
Toll: 24% (23.9M₫)
Labor: 15% (14.9M₫)
Maintenance: 13% (12.9M₫)

[Expense Table]
Category    Amount      Date        Vehicle   Trip         Receipt #
─────────────────────────────────────────────────────────────────────
Fuel        95,000₫     Mar 31      XE0001    Trip-0040     FU-12345
Toll        180,000₫    Mar 31      -         Trip-0040     BOT-6789
Labor       75,000₫     Mar 31      -         Trip-0040     LAB-0001
Fuel        88,000₫     Mar 30      XE0002    Trip-0039     FU-54321
Maintenance 1,200,000₫  Mar 29      XE0005    -             MNT-789
... (100+ items)

[Monthly Trend Graph - Bottom]
Month    Fuel      Toll      Labor     Maint     Total
─────────────────────────────────────────────────
Jan      12.5M     5M        3M        2M        22.5M
Feb      13.2M     4.8M      2.8M      2.5M      23.3M
Mar      15.1M     5.9M      3.1M      2.3M      26.4M
```

**Test Actions:**
- [ ] Click pie chart slice → Filter by category
- [ ] Click expense row → See details (receipt image if uploaded)
- [ ] Export → Download all expenses as Excel
- [ ] Filter by category (Fuel, Toll, Labor, Maintenance)
- [ ] Filter by date range
- [ ] Filter by vehicle or trip

---

### SECTION 6: Financial Reports (3 min)
**URL:** `http://localhost:5177/reports` or Dashboard → Reports

**What You Should See:**

#### Report 1: P&L Statement (Monthly)
```
┌─────────────────────────────────────────┐
│ Mar 2026 Profit & Loss Statement        │
├─────────────────────────────────────────┤
│ Revenue                  45,000,000 VND │
│ - Cost of Operations                    │
│   Fuel                  (9,580,000)    │
│   Tolls                 (4,750,000)    │
│   Labor                 (2,970,000)    │
│   Maintenance           (2,300,000)    │
│ ─────────────────────────────────────── │
│ Gross Profit            32,500,000 VND │
│ Profit Margin           72.2%           │
└─────────────────────────────────────────┘
```

#### Report 2: Vehicle Profitability
```
┌──────────────────────────────────┐
│ Vehicle Performance by Profit    │
├──────────────────────────────────┤
│ 1. XE0001 (Hino)   5,200,000 VND │ 🟢 Top performer
│ 2. XE0002 (Howo)   4,800,000 VND │ 🟢
│ 3. XE0003 (Thaco)  3,500,000 VND │ 🟢
│ ... (continues)                  │
│ 18. XE0018         120,000 VND   │ 🟡 Needs maintenance
│ 19. XE0019        -50,000 VND    │ 🔴 LOSS - Investigate
│ 20. XE0020        -80,000 VND    │ 🔴 LOSS - Investigate
└──────────────────────────────────┘
```

#### Report 3: Driver Performance
```
┌──────────────────────────────────┐
│ Driver Ranking by Profit         │
├──────────────────────────────────┤
│ 1. TX0001 (Trần Văn A)           │
│    25 trips | 8,750,000 VND      │ ⭐⭐⭐⭐⭐
│                                  │
│ 2. TX0005 (Lê Văn E)             │
│    22 trips | 7,820,000 VND      │ ⭐⭐⭐⭐⭐
│                                  │
│ 3. TX0002 (Nguyễn Văn B)         │
│    18 trips | 6,200,000 VND      │ ⭐⭐⭐⭐
│ ... (continues)                  │
│ 25. TX0024 (New Driver)          │
│     1 trip  | 50,000 VND         │ ⭐⭐
└──────────────────────────────────┘
```

---

## ✅ Feature Checklist - All Should Work

### Authentication & Access Control
- [ ] Can login with valid email/password
- [ ] Cannot login with invalid email/password
- [ ] Session persists on page refresh
- [ ] Logout clears session
- [ ] Role-based data visibility (driver can't see accountant reports)

### Dashboard
- [ ] All KPI cards display correctly
- [ ] Numbers match data in database
- [ ] Alerts show correct count and details
- [ ] Color coding works (green, yellow, red)

### Vehicles Section
- [ ] All 20 vehicles listed
- [ ] Status icons visible (🟢 Active, 🟡 Maintenance)
- [ ] Insurance expiry dates color-coded
- [ ] Click vehicle → shows trips + expenses
- [ ] Filter works (Active/Maintenance)

### Drivers Section
- [ ] All 25 drivers listed
- [ ] License/health expiry shown
- [ ] Trip count matches database
- [ ] Profit amount calculated correctly
- [ ] Performance stars visible

### Trips Section
- [ ] All 50 trips visible
- [ ] Status categories show correct counts
  - [ ] Pending: 20 trips
  - [ ] In Progress: 5 trips
  - [ ] Completed: 25 trips
- [ ] Revenue/Cost/Profit calculation correct
- [ ] Click trip → shows full details
- [ ] Expense details included in trip view

### Expenses Section
- [ ] All 100+ expenses listed
- [ ] Category breakdown pie chart visible
- [ ] Monthly trend graph shows data
- [ ] Filter by category works
- [ ] Total matches sum of all items

### Financial Reports
- [ ] P&L Statement shows correct totals
- [ ] Vehicle profitability ranking correct (by profit descending)
- [ ] Driver performance ranking correct (most profitable first)
- [ ] All calculations verified

### Export Functionality
- [ ] Can export vehicles as Excel
- [ ] Can export drivers as Excel
- [ ] Can export trips as Excel/PDF
- [ ] Can export expenses as Excel
- [ ] Click "Export" → File downloads

---

## 🐛 Debugging If Something's Wrong

### If data doesn't appear:
```javascript
// Check in browser console (F12 → Console tab)

// 1. Verify auth
firebase.auth().currentUser  // Should show { uid: '...', email: '...' }

// 2. Verify tenant ID
firebase.firestore().collection('users')
  .doc(firebase.auth().currentUser.uid)
  .get()
  .then(doc => console.log(doc.data()))
// Should show: { tenant_id: 'internal-tenant-1', role: 'driver|manager|...' }

// 3. Verify trip count
firebase.firestore()
  .collection('tenants').doc('internal-tenant-1')
  .collection('trips').get()
  .then(snap => console.log(`Trips: ${snap.size}`))
// Should return: Trips: 50
```

### If login fails:
1. Check email/password exactly (case-sensitive)
2. Verify Firebase project is connected
3. Check `src/config/firebase.ts` has correct project ID
4. Check .env file has VITE_FIREBASE_apiKey and other variables

### If Firestore permissions denied:
1. Check `firestore.rules` allows read/write for authenticated users
2. Verify user record exists in `users` collection
3. Check `tenant_id` field is set in user document
4. Verify trip documents have matching `tenant_id`

---

## 📊 Success Checklist

- [x] Demo data seeded (1,340+ records)
- [x] 6 demo users created with proper roles
- [x] Firestore rules configured
- [x] Demo accounts tested successfully
- [x] All features working with realistic data
- [ ] Login page updated with "Try Demo" button (Phase 2)
- [ ] Role-switching component added (Phase 2)
- [ ] Upgrade modals configured (Phase 2)
- [ ] Invite-a-friend logic implemented (Phase 2)
- [ ] Free trial countdown widget (Phase 2)

---

**You're all set! 🎉 Start testing now:**

```bash
npm run dev
→ http://localhost:5177/
→ Login with: taixedemo@tnc.io.vn / Demo@1234
```

Enjoy the full FleetPro experience!
