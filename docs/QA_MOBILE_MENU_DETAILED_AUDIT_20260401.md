# QA Mobile Detailed Menu Audit (2026-04-01T15:01:03.465Z)

- Base URL: `http://127.0.0.1:5175`
- Device profile: iPhone 12 (390x844)
- Portal audit: DISABLED (set PORTAL_EMAIL/PORTAL_PASSWORD)
- Evidence per menu: entry + interaction + sidebar
- Evidence directory: `docs\evidence\mobile-menu-audit\20260401-150103`
- Menu summary: 45 PASS / 0 WARN / 0 FAIL (total 45)

## Release Gate

- PASS: No known mobile menu defects detected in this run.

## Admin (admindemo@tnc.io.vn) - PASS

- Drawer layering: [PASS] containsSample=true, visible=true, zIndex=auto, width=224
- Drawer evidence: `docs/evidence/mobile-menu-audit/20260401-150103/drawer-1775055671943.png`

| Menu | Path | Status | Screenshot |
|---|---|---|---|
| Bang Dieu Khien | `/` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-bang-dieu-khien-entry.png` |
| Bao Cao | `/reports` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-bao-cao-entry.png` |
| Canh Bao | `/alerts` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-canh-bao-entry.png` |
| Xe | `/vehicles` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-xe-entry.png` |
| Tai Xe | `/drivers` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-tai-xe-entry.png` |
| Tuyen Duong | `/routes` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-tuyen-duong-entry.png` |
| Khach Hang | `/customers` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-khach-hang-entry.png` |
| Don Hang | `/transport-orders` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-don-hang-entry.png` |
| Dieu Phoi | `/dispatch` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-dieu-phoi-entry.png` |
| Tracking | `/tracking-center` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-tracking-entry.png` |
| Doanh Thu | `/trips` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-doanh-thu-entry.png` |
| Chi Phi | `/expenses` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-chi-phi-entry.png` |
| Bao Tri | `/maintenance` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-bao-tri-entry.png` |
| Kho Va Lop | `/inventory/tires` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-kho-va-lop-entry.png` |
| Ho So | `/profile` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-ho-so-entry.png` |
| Cai Dat | `/settings` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-cai-dat-entry.png` |
| Team | `/members` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-team-entry.png` |
| Logs | `/logs` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/admin-logs-entry.png` |

### Admin - Bang Dieu Khien (PASS)
- Final path: `/`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-bang-dieu-khien-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-bang-dieu-khien-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-bang-dieu-khien-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Bao Cao (PASS)
- Final path: `/reports`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-bao-cao-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-bao-cao-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-bao-cao-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /reports
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Canh Bao (PASS)
- Final path: `/alerts`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-canh-bao-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-canh-bao-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-canh-bao-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /alerts
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Xe (PASS)
- Final path: `/vehicles`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-xe-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-xe-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-xe-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /vehicles
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Tai Xe (PASS)
- Final path: `/drivers`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-tai-xe-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-tai-xe-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-tai-xe-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /drivers
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Tuyen Duong (PASS)
- Final path: `/routes`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-tuyen-duong-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-tuyen-duong-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-tuyen-duong-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /routes
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Khach Hang (PASS)
- Final path: `/customers`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-khach-hang-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-khach-hang-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-khach-hang-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /customers
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Don Hang (PASS)
- Final path: `/transport-orders`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-don-hang-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-don-hang-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-don-hang-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /transport-orders
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Dieu Phoi (PASS)
- Final path: `/dispatch`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-dieu-phoi-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-dieu-phoi-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-dieu-phoi-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /dispatch
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Tracking (PASS)
- Final path: `/tracking-center`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-tracking-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-tracking-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-tracking-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /tracking-center
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Doanh Thu (PASS)
- Final path: `/trips`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-doanh-thu-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-doanh-thu-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-doanh-thu-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /trips
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Chi Phi (PASS)
- Final path: `/expenses`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-chi-phi-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-chi-phi-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-chi-phi-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /expenses
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Bao Tri (PASS)
- Final path: `/maintenance`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-bao-tri-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-bao-tri-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-bao-tri-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /maintenance
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Kho Va Lop (PASS)
- Final path: `/inventory/tires`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-kho-va-lop-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-kho-va-lop-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-kho-va-lop-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /inventory/tires
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Ho So (PASS)
- Final path: `/profile`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-ho-so-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-ho-so-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-ho-so-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /profile
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Cai Dat (PASS)
- Final path: `/settings`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-cai-dat-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-cai-dat-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-cai-dat-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /settings
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Team (PASS)
- Final path: `/members`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-team-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-team-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-team-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /members
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Admin - Logs (PASS)
- Final path: `/logs`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/admin-logs-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/admin-logs-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/admin-logs-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /logs
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

## Manager (quanlydemo@tnc.io.vn) - PASS

- Drawer layering: [PASS] containsSample=true, visible=true, zIndex=auto, width=224
- Drawer evidence: `docs/evidence/mobile-menu-audit/20260401-150103/drawer-1775055740727.png`

| Menu | Path | Status | Screenshot |
|---|---|---|---|
| Bang Dieu Khien | `/` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-bang-dieu-khien-entry.png` |
| Bao Cao | `/reports` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-bao-cao-entry.png` |
| Canh Bao | `/alerts` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-canh-bao-entry.png` |
| Xe | `/vehicles` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-xe-entry.png` |
| Tai Xe | `/drivers` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-tai-xe-entry.png` |
| Tuyen Duong | `/routes` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-tuyen-duong-entry.png` |
| Khach Hang | `/customers` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-khach-hang-entry.png` |
| Don Hang | `/transport-orders` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-don-hang-entry.png` |
| Dieu Phoi | `/dispatch` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-dieu-phoi-entry.png` |
| Tracking | `/tracking-center` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-tracking-entry.png` |
| Doanh Thu | `/trips` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-doanh-thu-entry.png` |
| Chi Phi | `/expenses` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-chi-phi-entry.png` |
| Bao Tri | `/maintenance` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-bao-tri-entry.png` |
| Kho Va Lop | `/inventory/tires` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-kho-va-lop-entry.png` |
| Ho So | `/profile` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/manager-ho-so-entry.png` |

### Manager - Bang Dieu Khien (PASS)
- Final path: `/`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-bang-dieu-khien-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-bang-dieu-khien-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-bang-dieu-khien-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Manager - Bao Cao (PASS)
- Final path: `/reports`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-bao-cao-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-bao-cao-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-bao-cao-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /reports
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Manager - Canh Bao (PASS)
- Final path: `/alerts`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-canh-bao-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-canh-bao-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-canh-bao-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /alerts
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Manager - Xe (PASS)
- Final path: `/vehicles`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-xe-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-xe-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-xe-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /vehicles
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Manager - Tai Xe (PASS)
- Final path: `/drivers`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-tai-xe-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-tai-xe-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-tai-xe-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /drivers
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Manager - Tuyen Duong (PASS)
- Final path: `/routes`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-tuyen-duong-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-tuyen-duong-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-tuyen-duong-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /routes
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Manager - Khach Hang (PASS)
- Final path: `/customers`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-khach-hang-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-khach-hang-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-khach-hang-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /customers
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Manager - Don Hang (PASS)
- Final path: `/transport-orders`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-don-hang-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-don-hang-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-don-hang-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /transport-orders
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Manager - Dieu Phoi (PASS)
- Final path: `/dispatch`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-dieu-phoi-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-dieu-phoi-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-dieu-phoi-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /dispatch
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Manager - Tracking (PASS)
- Final path: `/tracking-center`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-tracking-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-tracking-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-tracking-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /tracking-center
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Manager - Doanh Thu (PASS)
- Final path: `/trips`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-doanh-thu-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-doanh-thu-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-doanh-thu-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /trips
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Manager - Chi Phi (PASS)
- Final path: `/expenses`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-chi-phi-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-chi-phi-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-chi-phi-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /expenses
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=50 lines=1 textLength=8

### Manager - Bao Tri (PASS)
- Final path: `/maintenance`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-bao-tri-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-bao-tri-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-bao-tri-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /maintenance
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Manager - Kho Va Lop (PASS)
- Final path: `/inventory/tires`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-kho-va-lop-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-kho-va-lop-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-kho-va-lop-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /inventory/tires
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Manager - Ho So (PASS)
- Final path: `/profile`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/manager-ho-so-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/manager-ho-so-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/manager-ho-so-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /profile
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

## Accountant (ketoandemo@tnc.io.vn) - PASS

- Drawer layering: [PASS] containsSample=true, visible=true, zIndex=auto, width=224
- Drawer evidence: `docs/evidence/mobile-menu-audit/20260401-150103/drawer-1775055799121.png`

| Menu | Path | Status | Screenshot |
|---|---|---|---|
| Bang Dieu Khien | `/` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/accountant-bang-dieu-khien-entry.png` |
| Bao Cao | `/reports` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/accountant-bao-cao-entry.png` |
| Khach Hang | `/customers` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/accountant-khach-hang-entry.png` |
| Don Hang | `/transport-orders` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/accountant-don-hang-entry.png` |
| Doanh Thu | `/trips` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/accountant-doanh-thu-entry.png` |
| Chi Phi | `/expenses` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/accountant-chi-phi-entry.png` |
| Bao Tri | `/maintenance` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/accountant-bao-tri-entry.png` |
| Kho Va Lop | `/inventory/tires` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/accountant-kho-va-lop-entry.png` |
| Ho So | `/profile` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/accountant-ho-so-entry.png` |

### Accountant - Bang Dieu Khien (PASS)
- Final path: `/`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-bang-dieu-khien-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-bang-dieu-khien-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-bang-dieu-khien-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Accountant - Bao Cao (PASS)
- Final path: `/reports`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-bao-cao-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-bao-cao-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-bao-cao-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /reports
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Accountant - Khach Hang (PASS)
- Final path: `/customers`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-khach-hang-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-khach-hang-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-khach-hang-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /customers
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Accountant - Don Hang (PASS)
- Final path: `/transport-orders`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-don-hang-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-don-hang-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-don-hang-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /transport-orders
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Accountant - Doanh Thu (PASS)
- Final path: `/trips`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-doanh-thu-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-doanh-thu-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-doanh-thu-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /trips
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: No visible heading detected.

### Accountant - Chi Phi (PASS)
- Final path: `/expenses`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-chi-phi-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-chi-phi-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-chi-phi-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /expenses
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=50 lines=1 textLength=8

### Accountant - Bao Tri (PASS)
- Final path: `/maintenance`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-bao-tri-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-bao-tri-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-bao-tri-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /maintenance
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Accountant - Kho Va Lop (PASS)
- Final path: `/inventory/tires`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-kho-va-lop-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-kho-va-lop-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-kho-va-lop-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /inventory/tires
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

### Accountant - Ho So (PASS)
- Final path: `/profile`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-ho-so-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-ho-so-interaction.png`
- Evidence sidebar: `docs/evidence/mobile-menu-audit/20260401-150103/accountant-ho-so-sidebar.png`
- Checks:
  - [PASS] Auth state: Current path /profile
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=130 lines=1 textLength=20

## Driver (taixedemo@tnc.io.vn) - PASS

- Drawer layering: [PASS] Driver layout does not use app sidebar drawer.

| Menu | Path | Status | Screenshot |
|---|---|---|---|
| Viec Hom Nay | `/driver` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/driver-viec-hom-nay-entry.png` |
| Lich Su | `/driver/history` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/driver-lich-su-entry.png` |
| Ca Nhan | `/driver/profile` | PASS | `docs/evidence/mobile-menu-audit/20260401-150103/driver-ca-nhan-entry.png` |

### Driver - Viec Hom Nay (PASS)
- Final path: `/driver`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/driver-viec-hom-nay-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/driver-viec-hom-nay-interaction.png`
- Checks:
  - [PASS] Auth state: Current path /driver
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=119 lines=1 textLength=11

### Driver - Lich Su (PASS)
- Final path: `/driver/history`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/driver-lich-su-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/driver-lich-su-interaction.png`
- Checks:
  - [PASS] Auth state: Current path /driver/history
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=119 lines=1 textLength=11

### Driver - Ca Nhan (PASS)
- Final path: `/driver/profile`
- Evidence entry: `docs/evidence/mobile-menu-audit/20260401-150103/driver-ca-nhan-entry.png`
- Evidence interaction: `docs/evidence/mobile-menu-audit/20260401-150103/driver-ca-nhan-interaction.png`
- Checks:
  - [PASS] Auth state: Current path /driver/profile
  - [PASS] Runtime crash: No crash screen detected.
  - [PASS] Horizontal overflow: No meaningful horizontal overflow.
  - [PASS] Header readability: headingWidth=119 lines=1 textLength=11

## Completion Criteria

1. All menus PASS for all required roles.
2. No FAIL and no WARN findings in final audit.
3. Every menu has screenshot evidence attached.
