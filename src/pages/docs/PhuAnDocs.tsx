import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronRight, ArrowLeft } from "lucide-react";

export default function PhuAnDocs() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <div className="bg-blue-900 text-white py-12 px-4 shadow-md">
        <div className="max-w-4xl mx-auto space-y-4">
          <Link to="/auth" className="inline-flex items-center text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại Đăng nhập
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Tài Liệu Trình Diễn FleetPro 5 Sao</h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl">
            Hệ điều hành Vận tải Đám mây (Cloud SaaS Transport OS) Số 1 Việt Nam. Phiên bản đặc biệt dành cho Phú An.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-12">
        
        {/* Section I */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 border-slate-200">I. TỔNG QUAN KIẾN TRÚC PHÂN QUYỀN (THE 4-PILLARS)</h2>
          <p className="text-slate-600">Sự khác biệt cốt lõi của FleetPro so với các phần mềm kế toán cồng kềnh là <strong>Kiến trúc Vận hành Đồng bộ Thời gian thực</strong> xoay quanh 4 vai trò nòng cốt. Thay vì nhập liệu thụ động, mọi dữ liệu tự chảy từ ngoài hiện trường vào phòng ban.</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-3">
              <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2">🚚 1. Tài Xế (Driver PWA)</h3>
              <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside">
                <li><strong>1-Click Xếp Lịch:</strong> Mở điện thoại là thấy ngay Lệnh điều xe hôm nay.</li>
                <li><strong>Biên Bản Giao Nhận (e-POD):</strong> Ký số trực tiếp trên màn hình, báo cáo tức thời.</li>
                <li><strong>Thanh Toán Tại Trận:</strong> Chụp bill tiền trạm thu phí, bốc xếp gửi về công ty trong 3 giây.</li>
                <li><strong>Chống Gian Lận (Anti-Fraud GPS):</strong> Bắt buộc Check-in tại tọa độ đã mã hóa. Bộ lọc tự phân tích tọa độ ảo.</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-3">
              <h3 className="text-lg font-bold text-orange-600 flex items-center gap-2">👔 2. Điều Phối Viên (Dispatch)</h3>
              <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside">
                <li><strong>Bản Đồ Cấp Bách (Live Map):</strong> Cập nhật từng mét đường di chuyển mỗi 10 giây. Không cần F5.</li>
                <li><strong>Lịch Trình Động (Kanban):</strong> Kéo thả xe thay đổi lộ trình, tự động bơm Push Notification đến Tài xế.</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-3">
              <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">🧾 3. Kế Toán (Finance)</h3>
              <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside">
                <li><strong>Đối Soát Thông Minh:</strong> So khớp các chi phí lặt vặt với Cước phí chuẩn Cảnh Báo Xanh/Đỏ để duyệt nhanh.</li>
                <li><strong>Không Dữ Liệu Rác:</strong> Phiếu chi tuyệt đối phải dính với MÃ XE hoặc MÃ CHUYẾN cụ thể.</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-3">
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">👑 4. Giám Đốc (Owner)</h3>
              <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside">
                <li><strong>Doanh Thu Triệt Để:</strong> Báo cáo Lời Lỗ nhảy theo từng chuyến hoàn thành, không đợi cuối tháng.</li>
                <li><strong>Cách Ly An Toàn:</strong> Tính năng Multi-tenant bảo mật tuyệt đối, dữ liệu lưu trong két sắt riêng.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section II */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 border-slate-200">II. 3 TÍNH NĂNG "WOW" KHIẾN DOANH NGHIỆP XUỐNG TIỀN</h2>
          
          <div className="space-y-4">
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
              <h3 className="font-bold text-indigo-900 text-lg">🚀 1. Luồng Sóng Radar Di Động (Live Tracking)</h3>
              <p className="text-indigo-800 text-sm mt-1">Khi tài xế bắt đầu chuyến, một cục Radar Xanh sẽ chớp liên tục báo hiệu sóng. Quản lý nhìn qua màn hình ở nhà sẽ thấy icon tải lết đi từng bước song song với xe thật. Quản lý chủ động giám sát lộ trình không cần gọi điện giục.</p>
            </div>

            <div className="bg-fuchsia-50 border-l-4 border-fuchsia-500 p-4 rounded-r-lg">
              <h3 className="font-bold text-fuchsia-900 text-lg">🤖 2. Trợ lý AI Xếp Chuyến (Ghép Chuyến Rỗng)</h3>
              <p className="text-fuchsia-800 text-sm mt-1">Hệ thống gợi ý thông minh quét qua kho Tải Trọng và Điểm Đến. Từ đó đưa ra lời khuyên "Ghép chung chuyến để giảm 300K tiền dầu" hoặc "Xếp cuốc ngược về để bù đắp chi phí lết lốp rỗng".</p>
            </div>

            <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-lg">
              <h3 className="font-bold text-teal-900 text-lg">📶 3. Tự Kháng Rớt Mạng (Offline-First)</h3>
              <p className="text-teal-800 text-sm mt-1">Tài xế bấm hoàn thành cuốc trên đèo Hải Vân rớt sóng, App vẫn hiển thị xanh. Dữ liệu tạm thời lưu thẳng vào trình duyệt và âm thầm đẩy lên server ngay phần trăm giây đầu tiên bát sóng lại. Cảm giác mượt mà hoàn mỹ.</p>
            </div>
          </div>
        </section>

        {/* Section III */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 border-b pb-2 border-slate-200">III. HƯỚNG DẪN 3 BƯỚC CHO PHÚ AN</h2>
          <p className="text-slate-600">Với một không gian Bàn làm việc hoàn toàn sạch sẽ, Phú An hãy bắt đầu vận hành theo chuẩn 3 bước sau:</p>

          <ol className="relative border-s border-slate-200 ml-3 space-y-6">                  
            <li className="ms-6">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-4 ring-white text-blue-800 font-bold">1</span>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Nạp Phi Đội Thực</h3>
                <p className="text-slate-600 text-sm">Truy cập `Quản lý Danh mục`. Nhập thông tin của 1-2 chiếc Xe thực tế thuộc sở hữu công ty, và thêm vài Tuyến đường quen thuộc.</p>
            </li>
            <li className="ms-6">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full -left-4 ring-4 ring-white text-orange-800 font-bold">2</span>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Dàn Trận Phân Việc</h3>
                <p className="text-slate-600 text-sm">Vào trung tâm `Bản Đồ Cấp Bách`. Dùng kỹ năng kéo thả, tạo nhanh 1 lệnh vận tải giao trực tiếp cho tài khoản Tài xế của công ty.</p>
            </li>
            <li className="ms-6">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-full -left-4 ring-4 ring-white text-emerald-800 font-bold">3</span>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Mở Máy Tận Hưởng Cỗ Máy</h3>
                <p className="text-slate-600 text-sm">Tài xế sử dụng app cập nhật liên tục mọi sự kiện trên đường. Giám đốc có thể thoải mái xem dòng tiền Lợi Nhuận tự động nhảy số cuối ngày.</p>
            </li>
          </ol>
        </section>

        <div className="mt-12 text-center pb-8 border-t pt-8">
            <Button size="lg" className="rounded-full shadow-lg h-14 px-8 text-lg" asChild>
                <Link to="/auth">
                    Trải Nghiệm Hệ Thống Ngay <ChevronRight className="ml-2 w-5 h-5" />
                </Link>
            </Button>
        </div>

      </div>
    </div>
  );
}
