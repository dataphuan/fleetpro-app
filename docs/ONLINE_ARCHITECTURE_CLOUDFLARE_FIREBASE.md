# FleetPro V1 Online Architecture (Cloudflare Pages + Firebase)

Last updated: 2026-03-28

## 1) Muc tieu

- Frontend chay tren Cloudflare Pages.
- Data engine chay 100% tren Firebase (Auth + Firestore + Storage).
- Loai bo phu thuoc Google Apps Script trong runtime production.
- Tenant isolation duoc enforce bang Firestore Security Rules.

## 2) Cau truc code hien tai

Frontend:
- src/App.tsx: router + layout + protected route.
- src/pages/*: cac man hinh nghiep vu (dashboard, vehicles, trips, expenses, reports, settings).
- src/components/*: UI + feature components.
- src/hooks/*: hooks truy van va mutation.

Data access:
- src/lib/firebase.ts: Firebase app initialization.
- src/lib/data-adapter.ts: adapter Firestore (list/get/create/update/delete theo tenant_id).
- src/services/googleSheetsService.ts: bridge GAS legacy (can disable for production mode).

Auth/session:
- src/contexts/AuthContext.tsx: local session restore (_fleetpro_session), role/tenant context.
- src/contexts/TenantContext.tsx: tenant config lookup (hien dang goi service legacy).

## 3) Data luu o dau

Target production storage:
- Firebase Authentication: tai khoan nguoi dung.
- Cloud Firestore: du lieu nghiep vu da tenant hoa.
- Firebase Storage: anh bill/hoa don/chung tu.

Collections khuyen nghi:
- tenants
- users
- vehicles
- drivers
- customers
- routes
- trips
- expenses
- maintenance
- audit_logs

Bat buoc moi document nghiep vu phai co:
- tenant_id
- created_at
- updated_at
- created_by (neu co)
- updated_by (neu co)

## 4) Frontend -> Backend luong de nghi

Cloudflare Pages (frontend) -> Firebase SDK:
- Login: signInWithEmailAndPassword
- Query: where('tenant_id', '==', currentTenant)
- Mutation: write vao doc cung tenant
- Upload anh: Firebase Storage path receipts/{tenant_id}/{trip_id}/...

Khong dung runtime GAS cho cac luong CRUD chinh.

## 5) Bao mat tenant

Nguon su that tenant:
- users/{uid}.tenant_id trong Firestore

Khong tin tenant_id tu client localStorage la quyen truy cap.
Rules Firestore moi la enforcement layer cuoi.

## 6) Code storage + deploy

Code storage:
- GitHub repository la source of truth.

Deploy frontend:
- Cloudflare Pages build command: npm run build
- Output directory: dist
- Env vars set tren Cloudflare Pages (Production + Preview)

Env vars can co:
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID

Khong dat cac token server-only vao bien VITE_.

## 7) Lo trinh cat GAS khoi runtime

Phase 1:
- Tat login bypass trong code.
- Chuyen cac hook CRUD chinh sang adapter Firestore.

Phase 2:
- TenantContext lay tenant tu Firestore users/tenants thay vi webhook GAS.
- Giu GAS chi de migration script mot lan (neu can).

Phase 3:
- Remove googleSheetsService khoi luong production.
- Xoa env VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL khoi Cloudflare Pages settings.

## 8) Release gate truoc khi online

Technical gate:
- npm run lint
- npm run typecheck
- npm run build

Security gate:
- Firestore rules tenant isolation pass (emulator + integration smoke)

Business gate:
- createTrip -> dispatch -> closeTrip flow pass
- quota/paywall guard pass theo plan

## 9) Security incident note

Neu key/token/password da lo:
- rotate ngay lap tuc (GitHub token, Firebase keys/secrets, email API key, admin password)
- khong commit secret vao repo
- su dung env management cua Cloudflare + Firebase
- xoa secret khoi lich su git neu tung commit truoc do
