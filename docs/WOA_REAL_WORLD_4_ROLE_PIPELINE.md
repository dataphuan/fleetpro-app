# WOA Practical Pipeline - 4 Account Groups (Free Tech Stack)

## 1) Muc tieu van hanh
- Moi vai tro nho duoc quy trinh ngan gon, lap lai duoc moi ngay.
- Moi hanh dong quan trong deu tao dau vet so (time, user, location, media, status).
- Moi su kien dieu phoi/bao cao deu day ve 1 kenh Telegram chung de giam tre thong tin.
- Uu tien mobile-first cho tai xe, desktop-first cho quan ly, nhung chung cung data va chung luong cong viec.

## 2) 4 nhom tai khoan va KPI thuc chien

### A. Tai xe (Driver)
Muc tieu:
- Bat dau ca dung gio.
- Bao cao du thong tin truoc khi chay.
- Cap nhat tien do dung su that, dung vi tri.

KPI ngay:
- 100% chuyen co check-in GPS dau ca.
- 100% chuyen co checklist xe + it nhat 2 anh dau xe/duoi xe.
- Ty le xac nhan lenh < 3 phut tu luc nhan thong bao.

### B. Dieu phoi (Dispatcher)
Muc tieu:
- Giao lenh nhanh, dung nguon luc.
- Khong de chuyen tre do cho xac nhan.

KPI ngay:
- Thoi gian tao va gan tai xe cho lenh < 5 phut.
- Ty le lenh bi tre do thieu thong tin < 5%.

### C. Ke toan (Accountant)
Muc tieu:
- Doi soat chung tu va chi phi theo chuyen trong ngay.

KPI ngay:
- 100% chuyen hoan thanh co trang thai doi soat.
- 95% chung tu duoc duyet/tra lai trong 24h.

### D. Quan ly/Admin
Muc tieu:
- Khoa so cuoi ngay, xu ly ngoai le, ra quyet dinh.

KPI ngay:
- 100% lenh trong ngay co trang thai cuoi.
- 100% ngoai le nghiem trong co ket luan xu ly.

## 3) Quy trinh thuc te 4 buoc cho moi vai tro

## 3.1 Driver - chi can nho 4 buoc moi ngay

### Buoc D1 - Mo app va xac nhan GPS dau ca
- Dang nhap bang phone.
- App bat buoc xin quyen vi tri.
- Neu accuracy > 50m thi yeu cau thu lai den khi dat nguong.
- Tao su kien: DRIVER_SHIFT_CHECKIN.

Du lieu luu:
- user_id, trip_id (neu co), lat, lng, accuracy, timestamp, device.

### Buoc D2 - Gui checklist xe + anh truoc chuyen
- Tick checklist an toan (lop, den, phanh, nhien lieu, giay to).
- Chup it nhat 2 anh xe (truoc/sau) + anh cong-to-met neu can.
- Gui bao cao vao he thong va day ve Telegram.
- Tao su kien: VEHICLE_PRECHECK_SUBMITTED.

### Buoc D3 - Xac nhan lenh dieu dong
- Neu co lenh: bam Dong y/Tu choi trong 3 phut.
- Neu Tu choi: bat buoc ly do.
- Tao su kien: DISPATCH_ACCEPTED hoac DISPATCH_REJECTED.

### Buoc D4 - Neu chua co lenh: tao NHAP va bao cao chu dong
- Tai xe bam Tao lenh nhap (time slot, khu vuc san sang, tai trong con trong).
- He thong gui thong bao den Quan ly + kenh Telegram chung.
- Tao su kien: DRIVER_DRAFT_ORDER_CREATED.

Mau thong diep Telegram:
- [DRIVER] draft-order | Tai xe: Nguyen Van A | So xe: 51D-12345 | Khu vuc: Thu Duc | Tu 08:00-11:00 | San sang nhan lenh.

## 3.2 Dispatcher - 4 buoc ngay nao cung lam

### Buoc P1 - Nhan bao cao dau ca
- Loc danh sach tai xe da check-in + da gui checklist.
- Danh dau tai xe san sang nhan lenh.

### Buoc P2 - Tao/Gan lenh dieu dong
- Chon chuyen, gan tai xe theo khu vuc, tai trong, lich su dung gio.
- He thong gui lenh + countdown 3 phut cho tai xe xac nhan.

### Buoc P3 - Theo doi xu ly ngoai le
- Neu qua han chua xac nhan, auto escalate cho Quan ly tren Telegram.
- Neu tai xe tu choi, de xuat tai xe thay the.

### Buoc P4 - Chot phan cong trong ngay
- Moi lenh phai co trang thai cuoi: Assigned/In-progress/Unassigned with reason.

## 3.3 Accountant - 4 buoc doi soat

### Buoc A1 - Lay danh sach chuyen da ket thuc
- Loc chuyen Completed trong ngay.

### Buoc A2 - Kiem tra chung tu tai xe gui
- Kiem tra anh/video hoa don, muc chi, ghi chu.

### Buoc A3 - Duyet hoac tra lai
- Duyet: ghi so tien hop le.
- Tra lai: bat buoc ly do, gui ve tai xe + Telegram.

### Buoc A4 - Chot doi soat cuoi ngay
- Trang thai cuoi moi chuyen: RECONCILED hoac PENDING_REASON.

## 3.4 Manager/Admin - 4 buoc chot van hanh

### Buoc M1 - Dashboard tong quan 10 phut dau ngay
- So tai xe check-in, so lenh cho xac nhan, so draft order.

### Buoc M2 - Xu ly escalations
- Lenh qua 3 phut chua xac nhan.
- Chuyen co rui ro GPS/bao cao su co.

### Buoc M3 - Phe duyet ngoai le
- Phe duyet tu choi lenh, dieu xe du phong, ghi nhan su co nghiem trong.

### Buoc M4 - Khoa so cuoi ngay
- Chot KPI ngay, xem danh sach pending, giao viec tiep theo cho hom sau.

## 4) State machine chung de thong nhat he thong
- DRAFT
- READY_FOR_DISPATCH
- DISPATCHED
- ACCEPTED
- IN_PROGRESS
- COMPLETED
- RECONCILING
- RECONCILED
- EXCEPTION
- CLOSED

Rule bat buoc:
- Khong cho vao IN_PROGRESS neu chua co D1 + D2.
- Khong cho CLOSED neu chua qua RECONCILED hoac chua co ly do pending hop le.

## 5) Telegram chung - schema su kien toi thieu
Moi message gui Telegram can co:
- event_type
- trip_code
- actor_role
- actor_name
- action
- timestamp
- location (neu co)
- media_url (neu co)
- status_after_action

Mau text ngan gon:
- [ROLE][EVENT] Trip T123 | Action: Accepted | By: tx.A | Time: 08:12 | GPS: 10.85,106.77 | Status: IN_PROGRESS

## 6) Bo cong cu free de chay duoc ngay
- Frontend: Cloudflare Pages (free).
- API nhe: Cloudflare Functions/Workers (free tier).
- Auth + DB + Storage: Firebase Spark (free muc co gioi han).
- Notify: Telegram Bot API (free).
- Bao cao nhanh: Google Sheets + Looker Studio (free).
- Giam sat uptime: UptimeRobot free.
- Log bao loi frontend: Cloudflare Web Analytics + console forwarding ve Telegram.

## 7) UX WOA (wow) nhung van thuc dung
- Moi vai tro chi thay 4 nut hanh dong chinh theo ngay.
- Thanh tien do 4 buoc luon hien tren mobile va desktop.
- Nut hanh dong lon, 1 tay bam duoc tren phone.
- Moi buoc xong deu co xac nhan ngay: Da luu, Da gui Telegram, Da cap nhat trang thai.
- Neu loi mang: cho phep luu tam offline, co nut Gui lai khi online.

## 8) Ke hoach ap dung 7 ngay (khong mau me)
Ngay 1:
- Chot 4 buoc cua tung vai tro, chot KPI, chot schema Telegram.

Ngay 2-3:
- Hoan thien UI 4 buoc cho Driver + Dispatcher.
- Bat buoc GPS check-in + checklist + media upload.

Ngay 4:
- Bo sung flow ke toan doi soat + ly do tra lai.

Ngay 5:
- Bo sung dashboard Manager + escalation rule.

Ngay 6:
- Chay pilot 1 doi xe that, ghi loi va sua trong ngay.

Ngay 7:
- Chot release gate: ty le hoan tat buoc, ty le loi, toc do xu ly.

## 9) Checklist release gate toi thieu
- Driver 4 buoc hoan tat >= 95%.
- Lenh xac nhan trong 3 phut >= 90%.
- 100% su kien quan trong co dau vet Telegram.
- Khong con trang thai treo qua 24h khong ly do.

## 10) Nguyen tac van hanh thuc chien
- It nut bam nhung dung nut.
- It trang thai nhung ro trang thai.
- Moi hanh dong quan trong phai co dau vet, co nguoi chiu trach nhiem, co thoi gian xu ly.
