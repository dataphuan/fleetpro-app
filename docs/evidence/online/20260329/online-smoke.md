# Online Smoke Test Logic (Phase 6)

Date: 2026-03-29
Tester: [____Nhập Tên Của Bạn____]
Target URL: `https://fleetpro-app.pages.dev/auth` (hoặc localhost)

## Test Scenarios (Business Gate & ID Strict Validation)

| ID | Scenario | Expected Result | Actual Result / Notes | Status (Pass/Fail) |
|---|---|---|---|---|
| 1 | Thêm Xe mới với mã ID không có `XE` (vd: `1234`) | Giao diện báo lỗi: "Mã xe không hợp lệ (Phải bắt đầu bằng XE)" | | [ ] |
| 2 | Thêm Tài xế mới với mã ID không có `TX` (vd: `9999`) | Giao diện báo lỗi: "Mã tài xế không hợp lệ (Phải bắt đầu bằng TX)" | | [ ] |
| 3 | Tạo khoản Chi Phí (Expense) với số tiền Âm (vd: `-500000`) | Giao diện báo lỗi: "Số tiền/Chi phí phải lớn hơn hoặc bằng 0" | | [ ] |
| 4 | Thêm Chuyến đi mới với mã ID không có `TD` | Giao diện báo lỗi: "Mã chuyến đi không hợp lệ (Phải bắt đầu bằng TD)" | | [ ] |
| 5 | Thêm Chuyến đi có: Ngày Đến < Ngày Đi | Giao diện báo lỗi: "Ngày đến phải sau hoặc cùng ngày với ngày đi" | | [ ] |
| 6 | Nhập dữ liệu chuẩn: Xe `XE001`, Tài `TX001` | Dữ liệu lưu thành công, hiển thị cập nhật trên giao diện | | [ ] |

## Ký Duyệt (Sign-off)
Hoàn thành Smoke Test: [ ] Có / [ ] Không
Quyết định cuối cùng phát hành: **GO** / **NO-GO**
