# 🔧 ISSUE #4 FIX: Add Test Tenants to Google Sheet

## 📋 Current Issue
- The Apps Script backend cannot create tenants without existing tenant context
- No test tenants exist in the Google Sheet that backs the Apps Script
- Phase C tests fail because API cannot find `internal-tenant-1` and `internal-tenant-2`

## ✅ Solution: Add 2 Rows to Google Sheet

I've opened: https://docs.google.com/spreadsheets/d/1SFXH7xwlMAGxjh-Y5PCglkadgxVVe5xRaEZZeewJv_o/edit

### Steps (2 minutes):

1. **Find the "Tenants" tab**
   - Look at the sheet tabs at the bottom
   - Click on "Tenants" (or similar name)
   - If it doesn't exist, create it

2. **Add Column Headers** (if row 1 is empty):
   ```
   tenant_id  | tenant_name  | domain              | status
   ```

3. **Add Row 2 (Tenant Alpha)**:
   ```
   internal-tenant-1 | Tenant Alpha | tenant-a.example.com | active
   ```

4. **Add Row 3 (Tenant Beta)**:
   ```
   internal-tenant-2 | Tenant Beta | tenant-b.example.com | active
   ```

5. **Save** (Ctrl+S)

### Example Sheet Layout:
```
| tenant_id            | tenant_name   | domain              | status |
|---|---|---|---|
| internal-tenant-1    | Tenant Alpha  | tenant-a.example.com| active |
| internal-tenant-2    | Tenant Beta   | tenant-b.example.com| active |
```

## ⏱️ Then
After adding the rows, reply and I'll immediately test Phase C:
```powershell
node scripts/online-release-gate.js --webapp "https://script..." --tenant-a internal-tenant-1 --tenant-b internal-tenant-2
```

Expected: **6/6 tests PASS** ✓
