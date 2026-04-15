# FleetPro Maintenance Log - Permission & Access Audit (2026-04-12)

## 📌 Structural Changes

### 1. Database Naming Convention
Standardized all Firestore collection names to `snake_case` to align with security rules and cross-platform compatibility.
- **Legacy**: `companySettings` -> **Current**: `company_settings`
- **Legacy**: `tripLocationLogs` -> **Current**: `trip_location_logs`
- **Logic**: All data adapters in `src/lib/data-adapter.ts` now point to snake_case.

### 2. Updated Permission Matrix (MAP)
Revised the role-based access control (RBAC) to support advanced financial and managerial workflows.
- **Accountant**: Granted `create` and `edit` rights for master data (`vehicles`, `drivers`, `routes`, `customers`).
- **Manager**: Merged with `dispatcher` capabilities. Manager is now the primary role for all operational management.
- **Rules**: `firestore.rules` updated to allow these write operations based on role.

### 3. Premium (PRO) Plan Defaults
- **Strategy**: To provide a "WOW" first-time experience, all new tenants now initialize with the `pro` plan.
- **Tenants Upgraded**: 
    - `internal-tenant-1` (Demo)
    - `internal-tenant-phuan` (Phú An Production)
- **Settings**: Default `trial_ends_at` set to +365 days.

### 4. 1-Touch Demo Experience
The `Auth.tsx` login page now features a clean 2x2 grid for the 4 primary demo roles, removing previous redundancy in the footer.

## 🛠️ Critical Bug Fixes
- **Login Failure**: Restored the missing `signInWithEmailAndPassword` import in `src/lib/data-adapter.ts` which was causing a `ReferenceError` on production.
- **Permission Denied**: Resolved the "No permission" error for tenant admins by syncing the `company_settings` naming convention.

---
*Maintained by Antigravity AI Assistant*
