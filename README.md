# FleetPro V1 Online

Repository da duoc don sach tai lieu legacy o thu muc goc.

Bo tai lieu chinh thuc hien tai nam trong thu muc docs:

- docs/ONLINE_ARCHITECTURE_CLOUDFLARE_FIREBASE.md
- docs/FIRESTORE_MIGRATION_EXECUTION_PLAN.md
- docs/MVP_UPGRADE_MASTER_PLAN_20260329.md
- docs/SPRINT_1_PROGRAM_A_EXECUTION_20260329.md
- docs/PROGRAM_A_SECURITY_TEST_MATRIX_20260329.md
- docs/RELEASE_NOTES_CLOUDFLARE_FULL_20260328.md
- docs/DEPLOY_EXECUTION_PLAN_20260329.md
- docs/BLOG_MENU_GUIDE.md

## Runtime hien tai

- Frontend deploy tren Cloudflare Pages (Vite build -> dist)
- Data engine dung Firebase (Auth + Firestore + Storage)
- Khong su dung Google Apps Script trong runtime production

## Local quality gate

- npm run lint
- npm run typecheck
- npm run build

## Luu y

- Khong dua secret vao source code hoac bien VITE_.
- Cac huong dan cu o root da duoc xoa de tranh conflict voi cau truc code hien tai.
