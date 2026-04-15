# FleetPro V3 — Blog Main Menu Guide

## Mục tiêu

Tối ưu menu Blog chính theo intent tìm kiếm ngành vận tải, tham chiếu cấu trúc nội dung dạng:

- Giải pháp theo vấn đề
- Chức năng chính
- Lợi ích
- CTA tư vấn

Mẫu tham chiếu: `https://tnk.com.vn/phan-mem-van-tai-pmvt`.

## Cấu trúc đề xuất (đã chuẩn hóa)

1. `Giải pháp theo vấn đề`
   - Điều phối xe thủ công
   - Thất thoát chi phí vận hành
   - Thiếu dữ liệu ra quyết định
2. `Chức năng chính`
   - Quản lý lộ trình
   - Điều phối đơn hàng - phương tiện - tài xế
   - Báo cáo doanh thu - lợi nhuận - chi phí
3. `Lợi ích triển khai`
   - Tối ưu tài nguyên đội xe
   - Nâng cao năng lực cạnh tranh
   - Case study thực tế

## Quy tắc SEO cho menu

- Mỗi item menu map trực tiếp 1 cụm từ khóa chính + 2-3 từ khóa phụ.
- Slug ngắn, rõ intent, tránh trùng lặp chủ đề.
- Ưu tiên nhóm nội dung theo nỗi đau doanh nghiệp trước, tính năng sau.
- Luôn có CTA `Nhận tư vấn giải pháp` ở cuối menu Blog.

## File cấu hình dùng lại

- `1-ONLINE/src/config/blogMainMenu.ts`

## Gợi ý triển khai UI

- Desktop: mega menu 3 cột (`Giải pháp`, `Chức năng`, `Lợi ích`).
- Mobile: accordion theo 3 nhóm chính, CTA cố định cuối danh sách.
- Featured posts: đặt trên cùng dropdown Blog để tăng CTR bài trụ cột.
