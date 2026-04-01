# FleetPro AI — Dev Commands cho Lucky
## 10 Tính Năng "Người Dùng Sẽ Nhớ Mãi"

**Giao cho:** Lucky (Dev Lead)  
**Từ:** Victor (Co-founder)  
**Ngày:** 01/04/2026  
**Triết lý xuyên suốt:** Mỗi tính năng phải pass test 1 câu hỏi — *"Tài xế 45 tuổi ít dùng điện thoại có tự làm được không?"*

---

## Cách dùng tài liệu này

Lucky đọc từng FEATURE block theo thứ tự. Mỗi block gồm:
- **WHY** — lý do business
- **UX SPEC** — hành vi kỳ vọng từ góc nhìn người dùng
- **DEV COMMAND** — câu lệnh giao việc cho AI code
- **DONE WHEN** — điều kiện nghiệm thu

Làm tuần tự F1 → F10. Không làm song song khi chưa pass F1.

---

# F1 — Dashboard "Sức Khỏe Đội Xe" Real-Time ⭐ PRIORITY #1

## WHY

Đây là trang đầu tiên chủ xe mở mỗi sáng. Nếu màn hình này đẹp và đúng, họ sẽ không cần mở app nào khác. Đây là "aha moment" quyết định họ có upgrade lên Pro hay không.

**Nguyên tắc thiết kế:** 1 màn hình, 1 cái nhìn, biết tất cả. Không cần click vào đâu thêm để hiểu đội xe đang ở trạng thái gì.

## UX SPEC — Bố Cục Dashboard

### VÙNG 1 — Hero KPI Bar (trên cùng, full width, 4 thẻ)

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  🚛 Đội xe   │ 🟢 Đang chạy │ 💰 Thu hôm nay│ ⚠️ Cảnh báo  │
│   8 / 8      │     3 xe     │  127.000.000 │    4 items   │
│  xe hoạt động│  5 chờ việc  │     VNĐ      │  cần xử lý   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

- Màu thẻ: neutral surface, con số màu primary teal
- Animation: số đếm lên khi load (từ 0 đến giá trị thật, 800ms)
- Mobile: 2x2 grid thay vì 4 thẻ ngang

### VÙNG 2 — Fleet Health Grid (phần chính, chiếm 60% màn hình)

Mỗi xe = 1 card. Card hiển thị:
```
┌─────────────────────────────────────────┐
│  🟢  51A-123.45        Đang chạy        │
│  Tài xế: Trần Văn Bình                  │
│  Tuyến: Nha Trang → Đà Nẵng   220 km   │
│  ──────────────────────────────────────  │
│  BH còn: 127 ngày  |  ĐK còn: 45 ngày  │
│  Chi phí hôm nay: 850.000đ             │
└─────────────────────────────────────────┘
```

Màu dot trạng thái xe:
- 🟢 Xanh = Đang chạy
- 🟡 Vàng = Chờ việc / Sẵn sàng
- 🔴 Đỏ = Bảo trì / Sự cố
- ⚫ Xám = Tạm dừng / Không hoạt động

Card alert indicator:
- Viền đỏ nhạt = BH/ĐK hết hạn trong 30 ngày
- Viền vàng nhạt = BH/ĐK hết hạn trong 31-60 ngày
- Không viền = bình thường

Grid layout: 3 cột desktop, 2 cột tablet, 1 cột mobile

### VÙNG 3 — Today's Activity Feed (sidebar phải)

Timeline dọc các sự kiện hôm nay:
```
09:15  🚛 51A-123.45 xuất phát → Đà Nẵng
08:30  💰 Chi phí nhiên liệu: 450.000đ (BKS 51A-456.78)
07:45  ✅ Chuyến CD26040001 hoàn thành — Trần Văn Bình
07:00  🔔 Nhắc: ĐK xe 51A-789.01 còn 30 ngày
```

### VÙNG 4 — Driver Mode Toggle (Đơn Giản Dashboard)

Hiện có toggle "Đơn Giản Dashboard / PRO Dashboard" ở góc trên phải.
Giữ nguyên toggle này nhưng làm cho Driver mode cực kỳ đơn giản:

**Driver Dashboard (Đơn Giản) phải có:**
- Tên tài xế + ảnh đại diện to, rõ
- Chuyến tiếp theo: điểm đi, điểm đến, giờ xuất phát (chữ TO, không nhỏ hơn 18px)
- Nút BẮT ĐẦU CHUYẾN: to, màu xanh primary, chiếm 80% width màn hình
- Thu nhập hôm nay: 1 con số lớn, đẹp
- KHÔNG hiển thị bất kỳ số liệu tài chính chi tiết nào của công ty

## DEV COMMAND CHO LUCKY

```
FEATURE F1 — DASHBOARD SỨC KHỎE ĐỘI XE REAL-TIME

Mục tiêu: Tái cấu trúc hoàn toàn trang Dashboard (/) để trở thành
"1 màn hình biết tất cả" cho chủ xe, và tách biệt hoàn toàn
Driver Dashboard đơn giản cho tài xế.

PHẦN A — Admin/Owner Dashboard (role: admin, manager)

1. Hero KPI Bar — 4 thẻ ngang full width:
   - Tổng xe hoạt động: count(vehicles where status != 'inactive')
   - Xe đang chạy: count(trips where status = 'Đang thực hiện' AND trip_date = today)
   - Thu hôm nay: sum(trips.revenue where trip_date = today)
   - Cảnh báo: count(alerts where status = 'unread' OR due_date <= today+30days)
   Mỗi con số có animation đếm từ 0 lên (duration 800ms, easing ease-out)

2. Fleet Health Grid — hiển thị mỗi xe 1 card:
   Với mỗi vehicle:
   a. Màu dot = vehicle.status (running/idle/maintenance/inactive)
   b. Biển số + trạng thái text tiếng Việt
   c. Nếu có trip đang chạy: hiện tên tài xế + tuyến + km
   d. BH còn bao nhiêu ngày: tính từ insurance_expiry_civil - today
   e. ĐK còn bao nhiêu ngày: tính từ inspection_expiry_date - today
   f. Chi phí hôm nay: sum(expenses.amount where vehicleId = this.id AND date = today)
   
   Màu viền card:
   - Đỏ nhạt (#fee2e2): BH hoặc ĐK còn <= 30 ngày
   - Vàng nhạt (#fef9c3): BH hoặc ĐK còn 31-60 ngày
   - Không viền: bình thường
   
   Grid: grid-cols-3 (desktop), grid-cols-2 (tablet <1024px), grid-cols-1 (mobile <640px)

3. Activity Feed sidebar — hiển thị 20 sự kiện gần nhất hôm nay:
   Events bao gồm: trip_started, trip_completed, expense_created, alert_triggered
   Format: [HH:MM] [icon] [mô tả ngắn tiếng Việt]
   Sort: mới nhất lên đầu

4. Data phải lấy từ real database, không hardcode. KPI "Thu Hôm Nay: 127 Tr"
   hiện đang hardcode — phải sửa thành query thật.

PHẦN B — Driver Dashboard (role: driver)

Khi user.role = 'driver', hiển thị giao diện đơn giản:

1. Header: "Xin chào, [tên tài xế]" — chữ to, ấm áp
2. Chuyến tiếp theo (next upcoming trip):
   - Điểm đi → Điểm đến: font-size 24px, bold
   - Giờ xuất phát: font-size 20px, màu primary
   - Tên khách hàng
   - Khoảng cách km
3. Nút CTA "✅ BẮT ĐẦU CHUYẾN": 
   - height: 64px
   - width: 100% (full width)
   - font-size: 20px
   - background: var(--color-primary)
   - border-radius: 12px
   - Khi click: confirm dialog "Bắt đầu chuyến [mã chuyến]?" → update trip.status = 'Đang thực hiện'
4. Thu nhập hôm nay: 1 số lớn duy nhất
5. Nếu không có chuyến tiếp theo: hiển thị "Hôm nay chưa có chuyến — nghỉ ngơi nhé 😊"
6. KHÔNG hiển thị: doanh thu công ty, số xe, chi phí tổng, alert của xe khác

PHẦN C — Auto-refresh

Toàn bộ dashboard tự refresh mỗi 60 giây (không reload trang, chỉ re-fetch data)
Hiển thị "Cập nhật lúc HH:MM:SS" ở góc dưới phải

DONE WHEN:
- Chủ xe mở app lúc 7am thấy ngay trạng thái toàn bộ đội xe
- Card xe có viền đỏ khi BH/ĐK sắp hết hạn
- Tài xế mở app chỉ thấy chuyến của mình, nút bắt đầu chuyến to rõ
- KPI "Thu Hôm Nay" khớp với sum dữ liệu trips thực tế
```

---

# F2 — Cảnh Báo Thông Minh BH/ĐK (Nhắc 30-60-90 Ngày)

## WHY

Một xe bị phạt vì BH hết hạn = mất 2-5 triệu + ảnh hưởng uy tín. Chủ xe không nhớ hạn của 8-20 xe. FleetPro nhớ thay họ = tính năng có giá trị rõ ràng ngay lập tức.

## UX SPEC

Trang `/alerts` hiện đang trống hoàn toàn. Phải có:
- List cảnh báo phân loại: Nguy cấp (đỏ) / Sắp đến (vàng) / Nhắc nhở (xanh)
- Mỗi alert: tên xe, loại hạn, ngày hết hạn, số ngày còn lại, nút "Đã xử lý"
- Badge số đỏ trên menu sidebar (đã có, cần gắn data thật)

## DEV COMMAND CHO LUCKY

```
FEATURE F2 — SMART ALERTS BH/ĐK

Mục tiêu: Xây dựng hoàn chỉnh trang /alerts với dữ liệu thật
và hệ thống badge notification.

1. Alert Generation Logic (chạy mỗi khi user mở app):
   Scan tất cả vehicles, với mỗi xe tính:
   
   function generateVehicleAlerts(vehicle) {
     const today = new Date()
     const alerts = []
     
     const dateFields = [
       { field: 'insurance_expiry_civil', label: 'BH Dân sự' },
       { field: 'insurance_expiry_body', label: 'BH Thân vỏ' },
       { field: 'inspection_expiry_date', label: 'Đăng kiểm' },
       { field: 'license_expiry', label: 'Giấy phép lưu hành' },
     ]
     
     for (const { field, label } of dateFields) {
       if (!vehicle[field]) continue
       const daysLeft = differenceInDays(new Date(vehicle[field]), today)
       if (daysLeft <= 90) {
         alerts.push({
           vehicleId: vehicle.id,
           plate: vehicle.plate_number,
           type: label,
           expiryDate: vehicle[field],
           daysLeft,
           severity: daysLeft <= 0 ? 'expired' : daysLeft <= 30 ? 'critical' : daysLeft <= 60 ? 'warning' : 'info'
         })
       }
     }
     return alerts
   }

2. Trang /alerts layout:
   - Tab: Tất cả | Nguy cấp 🔴 | Sắp đến 🟡 | Nhắc nhở 🔵 | Đã xử lý ✅
   - Mỗi alert card:
     [Màu severity] | Biển số xe | Loại | Hết hạn ngày X | Còn N ngày | [Đánh dấu đã xử lý]
   - Sort: expired trước, rồi theo daysLeft tăng dần

3. Sidebar badge: count(alerts where severity IN ['expired','critical'] AND status = 'unread')
   Badge đỏ, hiển thị số, update mỗi khi navigate

4. Tạo sample alerts từ vehicles hiện có:
   - Nếu vehicles chưa có expiry dates, seed thêm để có ít nhất 4-5 alerts
   - Ít nhất 1 xe có BH hết hạn trong 15 ngày (severity: critical)
   - Ít nhất 1 xe có ĐK hết hạn trong 45 ngày (severity: warning)

DONE WHEN:
- /alerts không còn trống
- Badge sidebar hiển thị đúng số cảnh báo
- Click vào alert card → xem chi tiết xe đó
- "Đánh dấu đã xử lý" ẩn alert khỏi danh sách active
```

---

# F3 — P&L Theo Từng Xe

## WHY

Đây là tính năng "killer" vì không đối thủ nào ở VN làm tốt. Chủ xe thường không biết xe nào lãi xe nào lỗ. FleetPro phải cho họ biết trong 1 màn hình.

## UX SPEC

Trang Reports → Tab "Lãi/Lỗ Theo Xe":
- Mỗi xe 1 hàng: Doanh thu | Chi phí | Lãi gộp | Margin% | Trend (↑↓)
- Bar chart ngang: xe xanh = lãi, xe đỏ = lỗ
- Bộ lọc: tháng, quý, năm

## DEV COMMAND CHO LUCKY

```
FEATURE F3 — P&L PER VEHICLE

Mục tiêu: Trang /reports → Tab "Lãi/Lỗ Theo Xe" hiển thị phân tích
lợi nhuận theo từng phương tiện, filter theo thời gian.

1. Data aggregation function:
   function calcVehiclePnL(vehicleId, dateRange) {
     revenue = sum(trips.revenue where vehicleId AND trip_date IN dateRange)
     cost = sum(expenses.amount where vehicleId AND expense_date IN dateRange)
     margin = revenue - cost
     marginPct = revenue > 0 ? (margin / revenue * 100).toFixed(1) : 0
     return { vehicleId, revenue, cost, margin, marginPct }
   }

2. UI bảng P&L:
   Cột: Xe | Biển số | Doanh thu | Chi phí | Lãi gộp | Margin% | So tháng trước
   Sort: mặc định theo Lãi gộp giảm dần
   Row màu: margin > 0 → text xanh, margin < 0 → text đỏ

3. Bar chart ngang (dùng Recharts hoặc Chart.js đang có):
   - X-axis: Lãi gộp (âm = đỏ, dương = xanh)
   - Y-axis: Biển số xe
   - Tooltip: hover hiện chi tiết doanh thu/chi phí

4. Date range picker: Tháng này | Tháng trước | Quý này | Năm này | Tùy chỉnh

5. Export: nút "Xuất Excel" và "Xuất PDF" — xuất bảng P&L

6. WARN STATE: nếu xe có margin < 0, hiện icon ⚠️ và tooltip 
   "Xe này đang lỗ — kiểm tra lại chi phí"

DONE WHEN:
- Chủ xe xem được xe nào lãi xe nào lỗ trong 30 giây
- Chart hiển thị đúng màu xanh/đỏ theo lãi/lỗ
- Export PDF có thể gửi cho kế toán ngay
```

---

# F4 — Tạo Chuyến Đi Trong 3 Click

## WHY

Phần mềm cũ yêu cầu 10-15 bước để tạo 1 chuyến. Nếu FleetPro làm được trong 3 click, đó là WOW moment ngay lập tức.

## UX SPEC

**Click 1:** Nút "+ Tạo Chuyến" → mở modal (không navigate trang mới)

**Click 2:** Chọn xe + tuyến đường (2 dropdown, pre-populated)

**Click 3:** Nút "Tạo Ngay" → chuyến được tạo, modal đóng, dashboard update

Tất cả trong 1 modal, không reload trang.

## DEV COMMAND CHO LUCKY

```
FEATURE F4 — 3-CLICK TRIP CREATION

Mục tiêu: Tạo chuyến đi trong tối đa 3 tương tác người dùng,
không rời khỏi trang hiện tại.

1. Nút "+ Tạo Chuyến" phải xuất hiện ở:
   - Dashboard (header area)
   - /dispatch (header area)
   - /trips (header area, đã có — giữ)

2. Modal "Tạo Chuyến Nhanh" (Quick Trip Modal):
   
   BƯỚC DUY NHẤT (1 form, không multi-step):
   - Chọn xe: Dropdown với biển số + tên tài xế phân công (auto-suggest)
   - Tuyến đường: Dropdown routes đã có, hiện km và thời gian ước tính
   - Ngày + giờ xuất phát: DateTimePicker, default = hôm nay + giờ hiện tại
   - Khách hàng: Dropdown customers (optional)
   - Ghi chú: textarea 1 dòng (optional)
   
   Auto-fill logic:
   - Khi chọn xe → tự điền tài xế đang phân công cho xe đó
   - Khi chọn tuyến → tự điền km, điểm đi, điểm đến
   - Revenue ước tính = route.base_price (nếu có)

3. Nút "Tạo Chuyến Ngay":
   - POST /trips với data
   - Success: modal đóng, show toast "✅ Chuyến [mã] đã được tạo"
   - Dashboard KPI tự cập nhật (không reload)
   - Error: inline validation, không đóng modal

4. Keyboard shortcut: Ctrl+N (hoặc Cmd+N) = mở modal tạo chuyến nhanh

5. Validation tối giản:
   - Required: xe, tuyến, ngày giờ
   - Optional: khách hàng, ghi chú
   - Nếu xe đang có chuyến chưa xong: show warning nhưng vẫn cho tạo

DONE WHEN:
- Đếm: từ lúc click "+" đến khi chuyến xuất hiện trong danh sách ≤ 3 click
- Không reload trang nào
- Toast xác nhận xuất hiện sau khi tạo
```

---

# F5 — Tài Xế Nhận Việc Qua Zalo (Không Cần Cài App)

## WHY

80% tài xế Việt Nam dùng Zalo mỗi ngày. Nếu tài xế nhận được lịch chuyến qua Zalo mà không cần cài FleetPro, đây là viral loop tự nhiên nhất.

## UX SPEC

Khi chuyến được tạo → hệ thống gửi Zalo message cho tài xế:
```
🚛 FleetPro — Chuyến mới được phân công

Tài xế: Trần Văn Bình
Biển số: 51A-123.45
Ngày: 02/04/2026 lúc 08:00
Tuyến: Nha Trang → Đà Nẵng (220 km)
Khách: Công ty Dệt may Thành Công

[✅ XÁC NHẬN NHẬN VIỆC]   [❌ Từ chối]

Được gửi bởi FleetPro AI
```

## DEV COMMAND CHO LUCKY

```
FEATURE F5 — ZALO NOTIFICATION CHO TÀI XẾ

Mục tiêu: Khi tạo chuyến, tự động gửi Zalo message cho tài xế.
Phase 1: Mock/simulate (chưa kết nối Zalo API thật)
Phase 2 (sau): tích hợp Zalo OA API thật

PHASE 1 — MOCK (triển khai ngay):

1. Trong form tạo chuyến: thêm checkbox "📱 Gửi thông báo Zalo cho tài xế" (default: checked)

2. Khi tạo chuyến thành công, nếu checkbox checked:
   - Hiển thị preview message trong modal con:
     ```
     Preview Zalo Message:
     ─────────────────────
     🚛 Chuyến mới: [mã chuyến]
     Ngày: [ngày giờ]
     Tuyến: [điểm đi] → [điểm đến]
     [Xác nhận] [Từ chối]
     ─────────────────────
     [Copy nội dung] [Mô phỏng đã gửi]
     ```
   - Nút "Mô phỏng đã gửi" → log vào activity feed "📱 Đã gửi Zalo cho [tên tài xế]"

3. Trong /drivers: thêm cột "Số Zalo" (= số điện thoại, Zalo dùng SĐT)
   Nếu driver.phone đã có → hiển thị icon Zalo màu xanh ✅
   Nếu chưa có → icon xám ○

4. Trong driver profile page: thêm nút "Test gửi Zalo" (mock)

PHASE 2 NOTES (cho tương lai):
- Zalo OA API: https://developers.zalo.me/docs
- Cần tạo Zalo Official Account cho FleetPro
- Message template cần được Zalo approve trước
- Webhook nhận callback khi tài xế confirm/từ chối

DONE WHEN (Phase 1):
- Tạo chuyến → thấy preview Zalo message đẹp
- Activity feed hiển thị "Đã gửi Zalo cho [tài xế]"
- Driver list có cột Zalo status
```

---

# F6 — Báo Cáo Tháng 1 Click Xuất PDF

## WHY

Kế toán yêu cầu báo cáo tháng. Nếu chủ xe xuất được PDF đẹp trong 1 click và gửi Zalo cho kế toán ngay, đây là tính năng tiết kiệm 2-3 giờ/tháng.

## UX SPEC

Trang `/reports`: nút "📄 Xuất Báo Cáo Tháng" to, ở đầu trang.
Click → chọn tháng → generate PDF → download hoặc copy link share.

PDF phải có: logo công ty, tổng doanh thu, chi phí, lãi gộp, bảng chi tiết theo xe.

## DEV COMMAND CHO LUCKY

```
FEATURE F6 — PDF REPORT 1 CLICK

Mục tiêu: Xuất báo cáo tháng dạng PDF đẹp trong 1 click.

1. Trang /reports: thêm nút "📄 Xuất Báo Cáo Tháng [Tháng/Năm]"
   Đặt ở đầu trang, kích thước btn-primary, màu primary

2. Khi click: month picker (default = tháng hiện tại)
   → Loading spinner "Đang tạo báo cáo..."
   → Generate HTML report → convert to PDF (dùng html2pdf.js hoặc @react-pdf/renderer)

3. Nội dung PDF báo cáo tháng:
   TRANG 1 — Tóm Tắt:
   - Logo FleetPro + Tên công ty + Tháng/Năm
   - 4 KPI boxes: Tổng doanh thu | Tổng chi phí | Lãi gộp | Số chuyến
   - Biểu đồ doanh thu theo tuần (line chart)
   
   TRANG 2 — Chi Tiết Theo Xe:
   - Bảng: STT | Biển số | Chuyến | Km | Doanh thu | Chi phí | Lãi gộp
   - Dòng tổng cộng in đậm ở cuối
   
   TRANG 3 — Chi Tiết Chi Phí:
   - Bảng: Ngày | Xe | Loại chi phí | Mô tả | Số tiền
   - Subtotal theo loại

4. PDF styling:
   - Font: NotoSans hoặc Roboto (support tiếng Việt có dấu)
   - Màu primary: #01696f (teal FleetPro)
   - Professional, clean layout
   - Footer: "Được tạo bởi FleetPro AI — [ngày tạo]"

5. Sau khi generate: hiện 2 options:
   - "⬇️ Tải xuống" → download file
   - "🔗 Copy link" → tạo shareable link (mock URL cho Phase 1)

DONE WHEN:
- Click 1 nút → có file PDF
- PDF có thể mở và đọc được trên điện thoại
- Tất cả số liệu trong PDF khớp với dữ liệu trên web
```

---

# F7 — Scan Hóa Đơn Chi Phí (OCR)

## WHY

Tài xế chụp hóa đơn đổ dầu, cầu đường → FleetPro tự điền số liệu. Tiết kiệm 30 phút/ngày cho người quản lý. Đây là tính năng AI có giá trị thực.

## UX SPEC

Trang `/expenses` → nút "📷 Scan Hóa Đơn"
Upload ảnh → hệ thống OCR → auto điền form → user confirm → lưu

## DEV COMMAND CHO LUCKY

```
FEATURE F7 — INVOICE OCR SCAN

Mục tiêu: Upload ảnh hóa đơn → OCR → tự điền form chi phí.
Phase 1: Mock OCR với form pre-fill demo
Phase 2: Tích hợp Google Vision API hoặc GPT-4 Vision thật

PHASE 1 — MOCK OCR:

1. Trang /expenses: thêm nút "📷 Scan Hóa Đơn" bên cạnh "Tạo chi phí"

2. Modal "Scan Hóa Đơn":
   - Upload zone: kéo thả hoặc click chọn ảnh
   - Preview ảnh sau khi upload
   - Nút "🔍 Nhận dạng hóa đơn"
   
3. Khi click nhận dạng:
   - Loading state "Đang đọc hóa đơn..." (2 giây delay để realistic)
   - Sau đó hiện form pre-filled với mock data:
     Loại chi phí: "Nhiên liệu" (auto-detected)
     Số tiền: 450.000 đ (auto-detected)
     Ngày: [ngày hiện tại]
     Mô tả: "Đổ dầu diesel"
     Ghi chú: "Trạm xăng Shell Nha Trang"
   - Các field có highlight vàng nhạt để user biết đây là "AI đọc được"
   - User có thể sửa trực tiếp trước khi lưu

4. Thêm badge "🤖 AI" nhỏ ở góc trên phải các field được auto-fill

PHASE 2 NOTES:
- Google Cloud Vision API: detect text from image
- Parse: tìm số tiền (regex: \d+[.,]\d+), ngày, tên sản phẩm
- Fallback: nếu không OCR được → mở form rỗng thông thường

DONE WHEN (Phase 1):
- Upload ảnh → thấy form tự điền
- UX flow mượt: upload → loading → pre-filled form → save
- Không crash khi upload file không phải hóa đơn
```

---

# F8 — GPS Location Realtime (Phase 2 Placeholder)

## WHY

Phase 2 tính năng. Hiện tại chuẩn bị UX và data structure, chưa cần hardware integration.

## DEV COMMAND CHO LUCKY

```
FEATURE F8 — GPS TRACKING PLACEHOLDER

Mục tiêu: Chuẩn bị đầy đủ UI và data model cho GPS Phase 2.

1. Trang /tracking-center (đã có trong sidebar):
   - Hiển thị bản đồ Leaflet (đã có ở /dispatch)
   - Mock 3-4 xe với vị trí lat/lng cố định tại Nha Trang
   - Mỗi marker: popup hiện biển số, tài xế, trạng thái chuyến
   - Hiển thị note "🔄 Đang phát triển — GPS realtime sắp ra mắt"

2. Vehicles table: thêm cột last_known_location (lat, lng, updated_at)
   Seed với vị trí Nha Trang: lat: 12.2388, lng: 109.1967

3. UX placeholder state đẹp, không để trang trống.

DONE WHEN:
- /tracking-center không còn trống
- Bản đồ có markers với thông tin xe
- User hiểu đây là tính năng đang phát triển
```

---

# F9 — So Sánh Xe vs Xe (Benchmark)

## WHY

Chủ xe 10 xe thường có cảm giác "xe này chạy tốt hơn xe kia" nhưng không có số liệu. FleetPro cho họ số liệu thật để ra quyết định thanh lý hoặc bảo dưỡng xe kém hiệu quả.

## DEV COMMAND CHO LUCKY

```
FEATURE F9 — VEHICLE BENCHMARK COMPARISON

Mục tiêu: So sánh hiệu suất 2-4 xe cùng lúc trong cùng kỳ thời gian.

1. Trang /reports → Tab mới "So Sánh Xe":
   - Multi-select: chọn 2-4 xe để so sánh
   - Date range picker

2. Radar chart (spider chart) hoặc grouped bar chart so sánh:
   - Doanh thu
   - Chi phí / km
   - Số chuyến
   - Margin %
   - Km đã chạy

3. Bảng so sánh ngang:
   | Chỉ số          | 51A-123.45 | 51B-456.78 | 51C-789.01 |
   |-----------------|-----------|-----------|-----------|
   | Doanh thu       | 45M       | 38M       | 52M       |
   | Chi phí / km    | 12.500đ   | 14.200đ   | 11.800đ   |
   | Margin          | 32%       | 18%       | 41%       |
   Màu: cell tốt nhất = xanh nhạt, tệ nhất = đỏ nhạt

4. AI insight text (mock):
   "✨ Xe 51C-789.01 có hiệu suất tốt nhất: margin 41%, chi phí/km thấp nhất.
   Xe 51B-456.78 cần chú ý: chi phí/km cao hơn 20% so với xe còn lại."

DONE WHEN:
- Chọn 2 xe → thấy bảng so sánh ngay lập tức
- Màu sắc highlight đúng xe tốt/kém
- AI insight text xuất hiện ở dưới bảng
```

---

# F10 — Export Dữ Liệu Tự Do (No Lock-in)

## WHY

Người dùng Việt Nam sợ bị "nhốt" trong phần mềm. Nếu FleetPro cho phép export toàn bộ dữ liệu bất cứ lúc nào, đây là trust signal mạnh nhất để họ dám nhập liệu nghiêm túc. Đây là chiến lược của Notion, Linear, Basecamp.

## DEV COMMAND CHO LUCKY

```
FEATURE F10 — FREE DATA EXPORT

Mục tiêu: User có thể export toàn bộ dữ liệu bất cứ lúc nào,
không cần liên hệ support, không giới hạn.

1. Trang /settings → Section "Dữ Liệu & Export":
   
   Export options:
   - "📊 Xuất tất cả xe (Excel)" → vehicles table → .xlsx
   - "👤 Xuất tất cả tài xế (Excel)" → drivers table → .xlsx
   - "🚛 Xuất tất cả chuyến đi (Excel)" → trips table → .xlsx
   - "💰 Xuất tất cả chi phí (Excel)" → expenses table → .xlsx
   - "📦 Xuất toàn bộ dữ liệu (ZIP)" → tất cả tables → zip file

2. Mỗi file Excel: có header tiếng Việt đầy đủ, không dùng column name kỹ thuật
   Ví dụ: "vehiclePlate" → "Biển số xe", "createdAt" → "Ngày tạo"

3. Messaging:
   Thêm text: "💚 Dữ liệu của bạn là của bạn. Export bất cứ lúc nào, không hạn chế."
   Màu xanh, đặt ở đầu section này.

4. Export log: ghi lại lịch sử export (date, user, type) trong /logs

5. Tốc độ: export < 5 giây cho dataset thông thường (<10.000 records)
   Nếu lớn hơn: show progress bar

DONE WHEN:
- Export 1 bảng trong < 3 giây
- File Excel mở được trên điện thoại (Google Sheets, WPS)
- Column headers là tiếng Việt
- Messaging "dữ liệu là của bạn" hiển thị rõ ràng
```

---

# TỔNG KẾT — Thứ Tự Triển Khai Lucky

| Thứ tự | Feature | Thời gian ước tính | Priority |
|--------|---------|-------------------|----------|
| 1 | F1 — Dashboard Sức Khỏe Đội Xe | 3 ngày | ⭐ FIRST |
| 2 | F2 — Cảnh Báo BH/ĐK | 1 ngày | CRITICAL |
| 3 | F4 — Tạo Chuyến 3 Click | 1 ngày | HIGH |
| 4 | F3 — P&L Theo Xe | 2 ngày | HIGH |
| 5 | F6 — Báo Cáo PDF | 2 ngày | HIGH |
| 6 | F10 — Export Tự Do | 0.5 ngày | MEDIUM |
| 7 | F9 — So Sánh Xe | 1 ngày | MEDIUM |
| 8 | F5 — Zalo Mock | 1 ngày | MEDIUM |
| 9 | F7 — OCR Mock | 1 ngày | LOW |
| 10 | F8 — GPS Placeholder | 0.5 ngày | LOW |

**Tổng ước tính: ~13 ngày dev**

---

## Tiêu Chí Nghiệm Thu Tổng Thể

Sau khi hoàn thành tất cả 10 features, thực hiện User Test:

**Test với 1 người thật (không phải dev):**
1. Mở Dashboard → Trong 10 giây họ có biết đội xe đang thế nào không?
2. Tạo 1 chuyến đi → Họ làm được trong 3 click không?
3. Xem xe nào lãi nhất tháng này → Họ tìm được trong 30 giây không?
4. Xuất báo cáo PDF → Họ làm được không cần hướng dẫn không?

**Nếu cả 4 test PASS = hoàn thành F1-F10 thành công.**

---

*FleetPro AI — Victor & Lucky. Build features users remember, not features users ignore.*
