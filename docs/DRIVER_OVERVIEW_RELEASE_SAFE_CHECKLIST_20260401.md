# Driver Overview Release-Safe Checklist (2026-04-01)

## 1) Quy tắc bắt buộc đã áp dụng

- [x] Mọi payload tạo mới có đủ: tenantId, driverId, createdAt, source.
- [x] Không hardcode tenant demo trong Driver Overview component.
- [x] Role không phải driver không thấy action driver-only.
- [x] Không tự cộng upload/photo/incident vào KPI tài chính.
- [x] Mỗi feature có loading/success/error state.
- [x] Có empty state cho màn hình không có chuyến.
- [x] Có feature flag/config gate khi backend chưa sẵn sàng.

## 2) Feature flag đang dùng

- VITE_FF_DRIVER_TRACKING_WRITE (mặc định bật, false để tắt ghi tracking)
- VITE_FF_DRIVER_RECEIPT_UPLOAD (mặc định bật, false để tắt upload)
- VITE_FF_DRIVER_EPOD_SIGNATURE (mặc định bật, false để tắt ký e-POD)
- VITE_FF_DRIVER_INCIDENT_REPORT (mặc định tắt, true để bật báo sự cố)

## 3) Tự test theo yêu cầu

### 3.1 Mobile width 375px
- [x] Đã chụp ảnh mobile 375.
- Evidence: docs/evidence/driver-overview/driver-overview-mobile-375.png

### 3.2 GPS allow/deny
- [x] Allow: QA phase4 pass, có flow check-in + live tracking persistence.
- [x] Deny: UI hiển thị lỗi GPS theo geolocationErrorToMessage (toast destructive).
- Evidence: kết quả npm run qa:phase4.

### 3.3 Upload ảnh lỗi
- [x] Có uploadState=error + thông báo lỗi UI.
- [x] Có toast lỗi khi upload thất bại.

### 3.4 Upload pdf lỗi
- [x] PDF bị chặn release-safe, trả lỗi rõ ràng: chưa hỗ trợ PDF ở bản này.

### 3.5 Tenant data isolation
- [x] Lọc chuyến theo tenantId ở Driver Overview.
- [x] Các payload tạo mới đều có tenantId + tenant_id.

## 4) Payload mẫu từng feature

### 4.1 GPS anomaly alert (create)
```json
{
  "tenantId": "internal-tenant-1",
  "tenant_id": "internal-tenant-1",
  "driverId": "HjMqfuqG04XeFi7zYiAIf449we62",
  "driver_id": "HjMqfuqG04XeFi7zYiAIf449we62",
  "createdAt": "2026-04-01T08:30:00.000Z",
  "created_at": "2026-04-01T08:30:00.000Z",
  "source": "driver-overview:gps-anomaly-alert",
  "alert_type": "gps_anomaly",
  "title": "GPS bat thuong - TRIP001",
  "message": "Phat hien bat thuong GPS: gps_jump (risk 75).",
  "reference_id": "trip_001",
  "reference_type": "trip",
  "severity": "critical",
  "is_read": false,
  "date": "2026-04-01T08:30:00.000Z",
  "metadata": {
    "trip_code": "TRIP001",
    "driver_email": "taixedemo@tnc.io.vn",
    "vehicle_id": "internal-tenant-1_vehicles_X01"
  }
}
```

### 4.2 Trip location log (create)
```json
{
  "tenantId": "internal-tenant-1",
  "tenant_id": "internal-tenant-1",
  "driverId": "HjMqfuqG04XeFi7zYiAIf449we62",
  "driver_id": "HjMqfuqG04XeFi7zYiAIf449we62",
  "createdAt": "2026-04-01T08:31:00.000Z",
  "created_at": "2026-04-01T08:31:00.000Z",
  "source": "driver-overview:trip-location-log",
  "trip_id": "trip_001",
  "trip_code": "TRIP001",
  "vehicle_id": "internal-tenant-1_vehicles_X01",
  "driver_uid": "HjMqfuqG04XeFi7zYiAIf449we62",
  "driver_email": "taixedemo@tnc.io.vn",
  "latitude": 12.25123,
  "longitude": 109.19123,
  "accuracy_m": 18,
  "event_type": "track_point",
  "recorded_at": "2026-04-01T08:31:00.000Z",
  "integrity_flags": [],
  "integrity_risk_score": 10
}
```

### 4.3 Driver incident report (create)
```json
{
  "tenantId": "internal-tenant-1",
  "tenant_id": "internal-tenant-1",
  "driverId": "HjMqfuqG04XeFi7zYiAIf449we62",
  "driver_id": "HjMqfuqG04XeFi7zYiAIf449we62",
  "createdAt": "2026-04-01T08:40:00.000Z",
  "created_at": "2026-04-01T08:40:00.000Z",
  "source": "driver-overview:driver-incident",
  "alert_type": "driver_incident",
  "title": "Tai xe bao su co - TRIP001",
  "message": "Tai xe taixedemo@tnc.io.vn bao su co trong chuyen TRIP001.",
  "reference_id": "trip_001",
  "reference_type": "trip",
  "severity": "warning",
  "is_read": false,
  "date": "2026-04-01T08:40:00.000Z",
  "metadata": {
    "trip_code": "TRIP001",
    "vehicle_id": "internal-tenant-1_vehicles_X01",
    "finance_impact_auto": false
  }
}
```

## 5) Evidence ảnh

- Desktop: docs/evidence/driver-overview/driver-overview-desktop.png
- Mobile 375: docs/evidence/driver-overview/driver-overview-mobile-375.png

## 6) File thay đổi

- src/pages/driver/DriverDashboard.tsx
- scripts/capture-driver-overview-screenshots.mjs
- docs/evidence/driver-overview/driver-overview-desktop.png
- docs/evidence/driver-overview/driver-overview-mobile-375.png
- docs/evidence/driver-overview/auth-debug.png
- docs/DRIVER_OVERVIEW_RELEASE_SAFE_CHECKLIST_20260401.md
