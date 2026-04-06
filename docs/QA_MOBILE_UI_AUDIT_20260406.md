# QA Mobile UI Audit - All Login Roles (2026-04-06T22:35:27.511Z)

- Base URL: `https://tnc.io.vn`
- Viewport: iPhone 12 profile, 390x844
- Summary: 1 PASS / 3 WARN / 0 FAIL

## Role Results

### Admin (admindemo@tnc.io.vn) - PASS
- Final URL: `https://tnc.io.vn/`
- Screenshot: `docs/evidence/mobile-ui-audit/mobile-admin.png`
- Checks:
  - [PASS] Role redirect: User landed on /
  - [PASS] Horizontal overflow: No overflow on 390px viewport
  - [PASS] Touch target size: All sampled targets >= 36px (36 elements)
  - [PASS] Mobile sidebar drawer: Drawer opens and displays navigation sections

### Manager (quanlydemo@tnc.io.vn) - WARN
- Final URL: `https://tnc.io.vn/`
- Screenshot: `docs/evidence/mobile-ui-audit/mobile-manager.png`
- Checks:
  - [PASS] Role redirect: User landed on /
  - [PASS] Horizontal overflow: No overflow on 390px viewport
  - [WARN] Touch target size: 8 interactive element(s) under 36px among 23
  - [PASS] Mobile sidebar drawer: Drawer opens and displays navigation sections
- Small touch targets sample:
  - button "(no text)" (40x33)
  - a "Hồ Sơ" (65x17)
  - a "Hướng dẫn" (96x17)
  - a "Xem video" (95x17)
  - button "Thu gọn" (89x33)
  - button "(no text)" (40x33)
  - a "(no text)" (24x17)
  - button "(no text)" (40x33)

### Accountant (ketoandemo@tnc.io.vn) - WARN
- Final URL: `https://tnc.io.vn/`
- Screenshot: `docs/evidence/mobile-ui-audit/mobile-accountant.png`
- Checks:
  - [PASS] Role redirect: User landed on /
  - [PASS] Horizontal overflow: No overflow on 390px viewport
  - [WARN] Touch target size: 8 interactive element(s) under 36px among 18
  - [PASS] Mobile sidebar drawer: Drawer opens and displays navigation sections
- Small touch targets sample:
  - button "(no text)" (40x33)
  - a "Hồ Sơ" (65x17)
  - a "Hướng dẫn" (96x17)
  - a "Xem video" (95x17)
  - button "Thu gọn" (89x33)
  - button "(no text)" (40x33)
  - a "(no text)" (24x17)
  - button "(no text)" (40x33)

### Driver (taixedemo@tnc.io.vn) - WARN
- Final URL: `https://tnc.io.vn/driver`
- Screenshot: `docs/evidence/mobile-ui-audit/mobile-driver.png`
- Checks:
  - [PASS] Role redirect: Driver landed on /driver
  - [PASS] Horizontal overflow: No overflow on 390px viewport
  - [WARN] Touch target size: 8 interactive element(s) under 36px among 20
  - [PASS] Driver bottom nav: Bottom navigation is visible
- Small touch targets sample:
  - button "(no text)" (40x33)
  - button "(no text)" (40x33)
  - button "De sau" (58x21)
  - button "🟢 Sẵn sàng" (94x23)
  - a "Nhận Xe" (81x17)
  - a "Check-in" (83x17)
  - a "Giấy Tờ" (77x17)
  - a "Kết Thúc" (84x17)

## Recommendation Priority

1. Fix all FAIL items before release.
2. Reduce WARN items related to touch targets and horizontal overflow.
3. Re-run this script after UI updates to compare delta.
