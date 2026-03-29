# QA Audit theo Đối tượng + Tab chức năng (Multi-tenant)

Mục tiêu tài liệu này là bắt lỗi thiếu sót theo đúng mô hình bạn yêu cầu:
- Mỗi công ty có `tenant_id` riêng, dữ liệu Google Sheets riêng.
- Có thể có Apps Script endpoint riêng theo từng công ty (tenant).
- Admin tổng có sheet riêng để quản lý account theo tenant (`User Account`).

## 1) Ma trận đối tượng kiểm thử

### Nhóm vai trò
- `admin_global`: quản trị tổng, xem nhiều tenant, quản lý account tenant.
- `admin_tenant`: quản trị trong một tenant.
- `editor_tenant`: được ghi dữ liệu nghiệp vụ tenant.
- `user_tenant`: chỉ đọc hoặc thao tác giới hạn.
- `public`: truy cập không token (nếu hệ thống cho phép).

### Điểm kiểm tra bắt buộc theo vai trò
1. `user_tenant` không được gọi mutation (`upsert`, `del`, `confirmTrip`, `closeTrip`).
2. `editor_tenant` được mutation trong tenant của mình, không được vượt tenant.
3. `admin_tenant` truy cập được sheet `User Account` của tenant tương ứng.
4. `admin_global` quản trị account tenant qua sheet `User Account` (bridge).
5. Role không phải admin không được list/get resource `useraccounts`.

## 2) Ma trận tab chức năng

Kiểm thử theo tab UI và resource backend tương ứng:
- Vehicles -> `resource=vehicles`
- Drivers -> `resource=drivers`
- Customers -> `resource=customers`
- Routes -> `resource=routes`
- Trips -> `resource=trips`
- Expenses -> `resource=expenses`
- Maintenance -> `resource=maintenance`

Mỗi tab cần có check:
1. `GET action=list` trả mảng hợp lệ.
2. Không lẫn dữ liệu tenant khác.
3. Token không đủ quyền thì trả lỗi rõ ràng (`forbidden` hoặc tương đương).

## 3) Kiểm thử đa tenant theo kiến trúc tách biệt

### Trường hợp A: cùng 1 Apps Script endpoint, tách theo tenant
1. Tenant A và B gọi cùng `webapp`, khác `tenant_id`.
2. `tenant-config` trả hồ sơ tenant riêng (app_name/domain/color/spreadsheet_id).
3. Không đọc chéo dữ liệu qua `keyValue` của tenant khác.

### Trường hợp B: mỗi tenant có Apps Script endpoint riêng
1. `webapp-a != webapp-b`.
2. `tenant-config` của A/B phải khác ít nhất 1 trường nhận diện.
3. Không có endpoint nào lộ dữ liệu tenant còn lại.

## 4) Sheet quản trị account theo tenant

Sheet chuẩn: `User Account`

Gợi ý cột:
- `tenant_id`
- `user_id`
- `email`
- `display_name`
- `role` (`admin_tenant`, `editor_tenant`, `user_tenant`)
- `status` (`active`, `inactive`)
- `api_token`
- `created_at`
- `updated_at`

Nguyên tắc:
1. Token trong sheet phải bị ràng buộc `tenant_id`.
2. Account `inactive` phải bị từ chối truy cập.
3. Chỉ admin role được xem/sửa `useraccounts`.

## 5) Chạy audit tự động

Lệnh nhanh (tenant A):

```bash
npm run online:qa:object-tab -- --webapp-a WEBAPP_A --tenant-a TENANT_A
```

Lệnh đầy đủ (A/B + role token):

```bash
npm run online:qa:object-tab -- \
  --webapp-a WEBAPP_A \
  --tenant-a TENANT_A \
  --webapp-b WEBAPP_B \
  --tenant-b TENANT_B \
  --admin-token ADMIN_GLOBAL_TOKEN \
  --tenant-admin-token TENANT_A_ADMIN_TOKEN \
  --tenant-editor-token TENANT_A_EDITOR_TOKEN \
  --tenant-user-token TENANT_A_USER_TOKEN
```

Exit code:
- `0`: không có FAIL
- `1`: có FAIL
- `2`: thiếu tham số bắt buộc

## 6) Điều kiện Go-Live đề xuất

Chỉ Go-Live khi:
1. QA object-tab audit không còn FAIL.
2. Release gate không còn FAIL bắt buộc.
3. Kiểm thử tenant A/B xác nhận không rò chéo dữ liệu.
4. `User Account` vận hành đúng phân quyền theo tenant.
