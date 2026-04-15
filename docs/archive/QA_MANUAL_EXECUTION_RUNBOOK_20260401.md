# QA Manual Execution Runbook - 2026-04-01

## Muc tieu
- Hoan tat 21 muc manual dang pending trong QA gate.
- Thu thap day du evidence de chuyen trang thai release tu NO-GO sang GO.

## Cach su dung
- Chay app local: `npm run dev`.
- Moi test case duoi day ghi ket qua vao cot `Status` va `Evidence`.
- `Status` dung 1 trong 3 gia tri: PASS | FAIL | BLOCKED.
- `Evidence` ghi duong dan screenshot/video/log (vi du: `docs/evidence/phase1/rbac-admin-menu.png`).

## Defect Severity
- Blocker: Chan release.
- P1: Anh huong nghiem trong, can fix trong 24h.
- P2: Co workaround, fix trong sprint.

## Manual Test Cases

| ID | Phase | Scope | Steps (tom tat) | Expected | Status | Evidence | Defect ID |
|----|-------|-------|------------------|----------|--------|----------|-----------|
| M-01 | 1 | Login role matrix | Dang nhap lan luot admin/manager/dispatcher/accountant/driver/viewer | Moi role dang nhap thanh cong, vao dung layout | PENDING | - | - |
| M-02 | 1 | Menu visibility by role | So sanh menu hien thi voi roleAccessMap | Menu dung theo role, khong du/quyen thua | PENDING | - | - |
| M-03 | 1 | Forbidden menu click | Tu role khong co quyen click menu bi khoa | Hien thong bao tu choi, khong dieu huong vao page cam | PENDING | - | - |
| M-04 | 2 | Master CRUD | Tao/sua/xoa Vehicles, Drivers, Routes, Customers | CRUD thanh cong, du lieu render dung | PENDING | - | - |
| M-05 | 2 | Dependency lock/unlock | Xoa master data de tao thieu dependency, vao tab ops; sau do bo sung du | Tab ops bi khoa khi thieu, mo khoa khi du master | PENDING | - | - |
| M-06 | 3 | Trips lifecycle | Tao trip moi va chuyen trang thai den completed/closed | Transition hop le, khong cho transition sai | PENDING | - | - |
| M-07 | 3 | Dispatch E2E | Dieu phôi theo ngay/tuan, update trip tu dispatch | Doi trang thai va assignment cap nhat dung | PENDING | - | - |
| M-08 | 3 | Expenses linking | Tao chi phi lien quan xe/chuyen va doi chieu report | Chi phi hien dung tren report lien quan | PENDING | - | - |
| M-09 | 3 | Transport + Maintenance consistency | Tao Don van chuyen + Bao tri, doi chieu danh sach/trang thai | Ban ghi nhat quan, khong mismatch lifecycle | PENDING | - | - |
| M-10 | 4 | Driver check-in + tracking | Driver bat dau chuyen, check-in GPS, theo doi watch location | Tao location logs day du check_in/track_point/check_out | PENDING | - | - |
| M-11 | 4 | Tracking filter | Tai Tracking Center, loc theo from/to date | Danh sach trip va logs loc dung theo ngay | PENDING | - | - |
| M-12 | 4 | Tracking export CSV/JSON/PDF | Export replay tu Tracking Center | File tao thanh cong, cot du lieu dung | PENDING | - | - |
| M-13 | 4 | Driver history filter/export | Tai Driver History, loc ngay va export replay | Loc dung, export thanh cong | PENDING | - | - |
| M-14 | 5 | Reports consistency | So sanh tong doanh thu/chi phi/loi nhuan voi data da tao phase 3 | Bao cao khop du lieu nghiep vu | PENDING | - | - |
| M-15 | 5 | Alerts GPS anomaly visibility | Tao tinh huong anomaly hoac seed anomaly, mo Alerts/Dashboard/Header | Canh bao anomaly hien thi dung muc/so luong | PENDING | - | - |
| M-16 | 5 | Settings/Members/Logs RBAC | Thu truy cap Settings/Members/Logs bang role khong phai admin | Role khong hop le bi chan dung | PENDING | - | - |
| M-17 | 6 | Empty/Error states | Tao tinh huong khong du lieu va loi query tai trang chinh | UI co thong diep ro rang, khong vo layout | PENDING | - | - |
| M-18 | 6 | Network failure | Tat mang tam thoi khi thao tac tracking/export/settings | Toast thong bao loi ro rang, app khong crash | PENDING | - | - |
| M-19 | 6 | Large export stability | Tao du lieu lon va export CSV/JSON/PDF | Export thanh cong, khong treo tab | PENDING | - | - |
| M-20 | 7 | Defect triage + retest | Tong hop tat ca FAIL/BLOCKED, fix, retest | Khong con Blocker/P1 mo | PENDING | - | - |
| M-21 | 7 | Final sign-off | Xac nhan ket qua voi Owner/PM/QA lead | Co quyet dinh GO/NO-GO chinh thuc | PENDING | - | - |

## Defect Register (manual run)

| Defect ID | Severity | Phase | Route/Page | Repro | Actual | Expected | Owner | ETA | Status |
|-----------|----------|-------|------------|-------|--------|----------|-------|-----|--------|
| - | - | - | - | - | - | - | - | - | - |

## Dieu kien chuyen GO
- Tat ca test case M-01..M-21 dat PASS hoac co waiver duoc phe duyet.
- Khong con Blocker/P1 dang mo.
- Re-run `npm run qa:phase7` va xac nhan `RELEASE_DECISION: GO`.
