# QA Audit Local Plan - Menu 100% Coverage

## Muc tieu
- Dam bao 100% menu co the check/fix/pass tai local truoc khi release.
- Kiem tra du 3 lop: menu hien thi, route truy cap, quyen role.
- Kiem tra function regression cua tung man hinh chinh.

## Gate pass bat buoc
- Gate 1: Menu coverage PASS (menu -> route -> role).
- Gate 2: Typecheck PASS.
- Gate 3: Build PASS.
- Gate 4: Smoke test route/menu PASS tren local.
- Gate 5: Khong con blocker/P1 trong bang loi.

## Lenh chay local
```bash
node scripts/qa-audit-menu-coverage.mjs
npm run typecheck
npm run build
```

## Scope menu can audit
### Main app menu
1. /
2. /vehicles
3. /drivers
4. /routes
5. /customers
6. /trips
7. /expenses
8. /transport-orders
9. /dispatch
10. /maintenance
11. /inventory/tires
12. /reports
13. /alerts
14. /sales
15. /coaching
16. /profile
17. /settings
18. /members
19. /logs
20. /tracking-center

### Driver menu
1. /driver
2. /driver/history
3. /driver/profile

### Portal route
1. /portal

## Checklist QA theo menu (Check -> Fix -> Pass)
- [ ] Co hien thi dung theo role
- [ ] Click menu di den dung route
- [ ] Page load khong blank/khong crash
- [ ] API call khong 4xx/5xx bat thuong
- [ ] Empty state hien thi dung
- [ ] Action chinh (create/update/filter/export) hoat dong
- [ ] Toast/error message ro rang
- [ ] Quay lai menu khong mat state nghiem trong

## Test matrix theo role
- Admin: thay tat ca menu.
- Manager: khong thay menu admin-only (`/settings`, `/members`, `/logs`).
- Dispatcher: thay menu van hanh, khong thay menu finance/report nhay cam.
- Accountant: thay menu tai chinh/chi phi/bao tri, khong thay menu admin-only.
- Driver: chi vao nhom `/driver/*`.
- Viewer: read-only cac menu cho phep.

## Uu tien regression theo tinh nang
- Tracking replay: loc ngay, map replay, export XLSX/JSON/PDF.
- Driver history: loc ngay, export replay, timeline click-highlight.
- Alerts summary: co du lieu canh bao tu GPS suspicious.
- Dispatch/trips/expenses: luong co ban tao-sua-xem.

## Muc tieu pass 100%
- 100% menu trong scope duoc danh dau PASS.
- 0 blocker, 0 P1.
- P2/P3 phai co workaround va ticket ro rang neu chua fix ngay.

## Mau bao cao ket qua
```text
[QA LOCAL AUDIT RESULT]
Date:
Tester:
Branch/Commit:

1) Gate status
- Menu coverage script: PASS/FAIL
- Typecheck: PASS/FAIL
- Build: PASS/FAIL

2) Menu coverage
- Total menus in scope: 24
- Passed: x
- Failed: y

3) Defects
- ID | Severity | Menu/Route | Step | Actual | Expected | Status

4) Final
- Release decision: GO / NO-GO
- Notes:
```
