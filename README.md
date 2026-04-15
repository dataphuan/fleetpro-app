# FleetPro — Quản Lý Vận Tải SaaS

> Phần mềm quản lý đội xe & vận tải SaaS đa tenant, thiết kế cho doanh nghiệp logistics Việt Nam.

[![Deploy](https://img.shields.io/badge/Production-tnc.io.vn-blue)](https://tnc.io.vn)
[![Phú An](https://img.shields.io/badge/Tenant-phuan.tnc.io.vn-green)](https://phuan.tnc.io.vn)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| Backend | Firebase (Firestore, Auth, Functions) |
| Hosting | Cloudflare Pages |
| Payment | PayPal + MoMo |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/dataphuan/fleetpro-app.git
cd fleetpro-app

# 2. Install
npm install

# 3. Generate seed data (required for build)
node scripts/generate-tenant-demo-seed.mjs

# 4. Dev server
npm run dev
```

## Project Structure

```
src/
├── components/   # 128 UI components (26 subdirectories)
├── pages/        # 42 page components
├── hooks/        # 28 custom hooks
├── lib/          # Core: data-adapter, firebase, rbac, schemas
├── services/     # AI, demo onboarding, background sync
├── contexts/     # AuthContext (global state)
├── config/       # Constants, feature flags
├── utils/        # Helpers, formatters
└── data/         # Generated seed data

scripts/          # Admin SDK tools (seed, cleanup)
functions/        # Cloudflare Pages Functions (payment webhooks)
docs/             # Architecture & developer guide
```

## Tenant Registry

| Tenant ID | Company | URL | Admin |
|---|---|---|---|
| `internal-tenant-1` | FleetPro Demo | tnc.io.vn | admindemo@tnc.io.vn |
| `internal-tenant-phuan` | Công ty Phú An | phuan.tnc.io.vn | admin@phuancr.com |

**Demo password (all accounts):** `Demo@1234`

## Documentation

- **[Architecture](docs/ARCHITECTURE.md)** — System design, data model, RBAC
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** — Setup, deploy, admin scripts
- **[Contributing](docs/CONTRIBUTING.md)** — Code standards, PR workflow

## Deploy

```bash
# Deploy Firestore rules
npx firebase deploy --only firestore:rules

# Production is auto-deployed via Cloudflare Pages on push to main
git push origin main
```

## License

Proprietary — © 2026 TNC Solutions
