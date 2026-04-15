# QA Audit Chuyen Sau Theo Phase

## 1. Muc tieu
- Dam bao chat luong release theo mo hinh gate tung phase, khong bo sot menu va luong nghiep vu.
- Muc tieu cuoi: pass 100% menu trong scope, khong con blocker va P1.
- Bao phu 4 lop chat luong: Functional, Integration, Security/Permission, Performance/Resilience.

## 2. Scope he thong
- Main app routes va menu trong [src/App.tsx](src/App.tsx) va [src/components/layout/AppSidebar.tsx](src/components/layout/AppSidebar.tsx).
- Driver portal trong [src/components/layout/DriverLayout.tsx](src/components/layout/DriverLayout.tsx).
- Replay va audit exports trong [src/pages/TrackingCenter.tsx](src/pages/TrackingCenter.tsx) va [src/pages/driver/DriverHistory.tsx](src/pages/driver/DriverHistory.tsx).
- Data export helper trong [src/lib/export.ts](src/lib/export.ts).

## 3. Quan ly gate tong
- Gate A: Menu coverage pass.
- Gate B: Build va typecheck pass.
- Gate C: Functional phase 1-5 pass.
- Gate D: Security va permission pass.
- Gate E: Performance va resilience pass.
- Gate F: UAT va release readiness pass.

## 4. Phase chi tiet

## Phase 0 - Readiness va Baseline
### Muc tieu
- Xac lap baseline ky thuat va du lieu test.

### Checklists
- Chay menu coverage script.
- Chay typecheck va build.
- Chuan bi tai khoan role: admin, manager, dispatcher, accountant, driver, viewer.
- Chuan bi test data theo tenant co du trips, logs, alerts, drivers, vehicles.

### Lenh
- npm run qa:menu-audit
- npm run typecheck
- npm run build

### Exit criteria
- 3 lenh pass 100%.
- Khong con compile error.

## Phase 1 - Auth, RBAC, Navigation
### Muc tieu
- Dam bao moi role chi thay va truy cap dung menu duoc cap quyen.

### Scope
- Auth flow trong [src/pages/Auth.tsx](src/pages/Auth.tsx).
- Route bao ve trong [src/components/auth/ProtectedRoute.tsx](src/components/auth/ProtectedRoute.tsx).
- Role map va menu hien thi trong [src/components/layout/AppSidebar.tsx](src/components/layout/AppSidebar.tsx).

### Test cases chinh
- TC1: Chua login truy cap route protected => redirect auth.
- TC2: Admin thay full menu main app theo role map.
- TC3: Manager khong thay menu admin-only.
- TC4: Dispatcher khong thay nhom finance restricted.
- TC5: Driver vao /driver va khong vao duoc main menu nhay cam.
- TC6: Viewer read-only menu cho phep.
- TC7: Click menu bi cam => thong bao ro rang.

### Exit criteria
- 100% TC RBAC pass.
- Khong co P1 permission bypass.

## Phase 2 - Master Data va Data Dependency Gate
### Muc tieu
- Dam bao danh muc nen dung, validation dung, va dependency gate hoat dong.

### Scope
- Vehicles, Drivers, Routes, Customers pages.
- Khoa nghiep vu khi thieu master data qua logic sidebar.

### Test cases chinh
- TC1: CRUD danh muc co validate bat buoc.
- TC2: Search/filter/sort paging hoat dong.
- TC3: Duplicate key handling dung.
- TC4: Thieu master data thi Trips/Dispatch/Expenses bi chan dung thong diep.
- TC5: Co master data day du thi mo khoa menu nghiep vu.

### Exit criteria
- 0 loi blocker CRUD.
- Dependency gate pass 100%.

## Phase 3 - Operations Core
### Muc tieu
- Dam bao luong van hanh doanh thu, dieu phoi, chi phi, don hang, bao tri.

### Scope
- [src/pages/Trips.tsx](src/pages/Trips.tsx)
- [src/pages/Dispatch.tsx](src/pages/Dispatch.tsx)
- [src/pages/Expenses.tsx](src/pages/Expenses.tsx)
- [src/pages/TransportOrders.tsx](src/pages/TransportOrders.tsx)
- [src/pages/Maintenance.tsx](src/pages/Maintenance.tsx)
- [src/pages/inventory/TireInventory.tsx](src/pages/inventory/TireInventory.tsx)

### Test cases chinh
- Tao moi, sua, dong bo trang thai theo lifecycle.
- Cross-module consistency: Trip tao ra co the hien tai Dispatch/Expense/Report.
- Validation so lieu: amount, date, required ref.
- Export/import neu co tren page.

### Exit criteria
- Khong co mismatch nghiep vu lien module.
- 95%+ test scenario pass, khong co blocker.

## Phase 4 - Driver PWA, Tracking, Integrity, Replay
### Muc tieu
- Dam bao luong tai xe va theo doi hanh trinh on dinh, audit duoc.

### Scope
- [src/pages/driver/DriverDashboard.tsx](src/pages/driver/DriverDashboard.tsx)
- [src/pages/driver/DriverHistory.tsx](src/pages/driver/DriverHistory.tsx)
- [src/pages/TrackingCenter.tsx](src/pages/TrackingCenter.tsx)
- [src/components/tracking/TripReplayMap.tsx](src/components/tracking/TripReplayMap.tsx)
- [src/lib/location-integrity.ts](src/lib/location-integrity.ts)
- [src/hooks/useTripLocationLogs.ts](src/hooks/useTripLocationLogs.ts)

### Test cases chinh
- TC1: Check-in GPS voi do chinh xac thap bi canh bao dung.
- TC2: Watch tracking ghi log dung event type.
- TC3: Integrity flags sinh ra dung voi jump/speed anomaly.
- TC4: Tracking Center filter ngay dung tren trips va logs.
- TC5: Export replay XLSX dung cot, dung du lieu filtered.
- TC6: Export JSON co summary + filters + logs.
- TC7: Export PDF tao file thanh cong, thong tin risk day du.
- TC8: Driver history filter va replay hoat dong nhu admin view.

### Exit criteria
- 100% replay/export test pass.
- Khong co sai so du lieu audit.

## Phase 5 - Reports, Alerts, Profile, Settings
### Muc tieu
- Chot chat luong bao cao va cac trang quan tri phu tro.

### Scope
- [src/pages/Reports.tsx](src/pages/Reports.tsx)
- [src/pages/Alerts.tsx](src/pages/Alerts.tsx)
- [src/pages/UserProfilePage.tsx](src/pages/UserProfilePage.tsx)
- [src/pages/Settings.tsx](src/pages/Settings.tsx)
- [src/pages/Members.tsx](src/pages/Members.tsx)
- [src/pages/Logs.tsx](src/pages/Logs.tsx)

### Test cases chinh
- Bao cao tong hop dung so lieu sau khi tao transaction o phase 3.
- Alerts co nhan du lieu suspicious GPS moi.
- Role restrictions tren settings/members/logs chinh xac.
- Profile update/change password pass.

### Exit criteria
- 0 mismatch bao cao tong hop.
- 0 loi permission escalation.

## Phase 6 - Non Functional
### Muc tieu
- Danh gia hieu nang, do on dinh, va truong hop loi.

### Performance checks
- First load khong vo hieu hoa trang.
- Route replay mo duoc trong muc chap nhan du lieu lon.
- Export PDF/XLSX/JSON khong crash tab.

### Resilience checks
- Mat mang tam thoi: thong bao loi ro rang.
- Empty state: khong render vo nghia.
- API fail: co toast fallback.

### Security checks
- Route guard khi direct URL.
- Role guard khi thao tac URL manual.

### Exit criteria
- Khong co P1 performance/security.
- P2 co workaround ro rang.

## Phase 7 - UAT va Release Decision
### Muc tieu
- Chot release GO/NO-GO dua tren bang chung.

### Dieu kien GO
- Tat ca gate A-F pass.
- Blocker = 0.
- P1 = 0.
- P2 <= nguong da duyet va co rollback plan.

### Deliverables
- Bao cao ket qua theo mau.
- Danh sach loi con lai + ETA.
- Bien ban GO/NO-GO.

## 5. Defect severity va SLA
- Blocker: chan release, fix ngay trong ngay.
- P1: fix trong 24h.
- P2: fix trong sprint gan nhat.
- P3: backlog.

## 6. Tracking KPI QA
- Menu coverage pass rate.
- Test case pass rate theo phase.
- Defect leakage rate sau fix.
- Mean time to verify.

## 7. Khuyen nghi van hanh QA local
- Chay theo thu tu phase, khong nhaycoc.
- Moi phase phai co sign-off truoc khi qua phase sau.
- Chup evidence: screenshot + log + file export mau.
