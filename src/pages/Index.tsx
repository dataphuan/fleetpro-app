import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Truck, BarChart3, Shield, Users, MapPin, Zap, ChevronRight, Star, ArrowRight, Phone, MessageCircle, Mail, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const FEATURES = [
  { icon: Truck, title: "Quản lý đội xe", desc: "20+ trường dữ liệu, BH-ĐK-ĐKiểm tự cảnh báo hết hạn" },
  { icon: Users, title: "Quản lý tài xế", desc: "Hồ sơ, bằng lái, phân công xe, GPS real-time" },
  { icon: BarChart3, title: "Doanh thu & Chi phí", desc: "Nhiên liệu, cầu đường, khoán lái, lợi nhuận tự tính" },
  { icon: MapPin, title: "Điều phối & Tracking", desc: "Giao chuyến, 4-bước giao nhận, GPS xác nhận vị trí" },
  { icon: Shield, title: "Phân quyền 6 vai trò", desc: "CEO, Quản lý, Kế toán, Điều phối, Tài xế, Xem" },
  { icon: Zap, title: "AI trợ lý thông minh", desc: "Hỏi đáp dữ liệu bằng tiếng Việt, gợi ý tối ưu chi phí" },
];

const PLANS = [
  { name: "Dùng thử", price: "0₫", period: "14 ngày", features: ["5 xe", "5 tài xế", "100 chuyến/tháng", "Đầy đủ tính năng"], cta: "Bắt đầu miễn phí", highlight: false },
  { name: "Professional", price: "499k", period: "/tháng", features: ["50 xe", "25 tài xế", "2,000 chuyến/tháng", "Export Excel", "Hỗ trợ ưu tiên"], cta: "Nâng cấp Pro", highlight: true },
  { name: "Enterprise", price: "Liên hệ", period: "", features: ["Không giới hạn xe", "Không giới hạn tài xế", "GPS tracking real-time", "AI trợ lý", "API tích hợp", "Hỗ trợ 24/7"], cta: "Liên hệ tư vấn", highlight: false },
];

const TESTIMONIALS = [
  { name: "Anh Nguyễn Văn Tùng", role: "Giám đốc, Cty Vận tải Hoàng Long", quote: "FleetPro giúp tôi kiểm soát 30 xe chỉ với điện thoại. Trước đây phải gọi điện từng tài xế." },
  { name: "Chị Trần Thị Mai", role: "Kế toán, Logistics Phú An", quote: "Chi phí nhiên liệu giảm 15% nhờ theo dõi chính xác từng chuyến. Đối soát nhanh gấp 5 lần." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center font-bold text-sm">FP</div>
            <span className="font-bold text-lg tracking-tight">FleetPro</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" className="text-slate-200 hover:text-white hover:bg-white/10 hidden sm:inline-flex" asChild>
              <a href="#pricing">Bảng giá</a>
            </Button>
            <Button variant="ghost" className="text-slate-200 hover:text-white hover:bg-white/10 hidden sm:inline-flex" asChild>
              <a href="#features">Tính năng</a>
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/20" asChild>
              <Link to="/auth">Đăng nhập</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.15)_0%,_transparent_70%)]" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6 sm:mb-8 text-sm text-blue-300 font-medium">
            <Zap className="w-4 h-4" /> Phần mềm quản lý vận tải #1 Việt Nam
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-5 sm:mb-6 bg-gradient-to-r from-white via-white to-blue-200 bg-clip-text text-transparent">
            Quản lý đội xe thông minh, <br className="hidden sm:block" />
            tăng lợi nhuận thực
          </h1>
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Từ 2 xe đến 200 xe — FleetPro giúp bạn kiểm soát chi phí, tối ưu doanh thu và số hóa toàn bộ quy trình vận tải chỉ trong 5 phút.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 shadow-lg shadow-blue-500/25 font-semibold" asChild>
              <Link to="/auth">
                Dùng thử miễn phí 14 ngày <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-white/10 text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 font-semibold" asChild>
              <a href="https://zalo.me/0989890022" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5 mr-2" /> Tư vấn qua Zalo
              </a>
            </Button>
          </div>
          <p className="text-sm text-slate-400 mt-4">Không cần thẻ tín dụng • Thiết lập trong 5 phút • Hỗ trợ tiếng Việt</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 sm:py-12 border-y border-white/10 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
          {[
            ["50+", "Doanh nghiệp"],
            ["1,200+", "Xe đang quản lý"],
            ["99.9%", "Uptime"],
            ["24/7", "Hỗ trợ kỹ thuật"],
          ].map(([num, label]) => (
            <div key={label}>
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{num}</div>
              <div className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4">Tất cả trong một nền tảng</h2>
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">Không cần Excel, không cần sổ tay. Mọi thứ tự động hóa từ A đến Z.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} className="bg-slate-800/60 border-slate-700/60 hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-1 group">
                <CardContent className="p-5 sm:p-6">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4 group-hover:bg-blue-500/25 transition-colors">
                    <f.icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-20 px-4 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 sm:mb-12">Khách hàng nói gì?</h2>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="bg-slate-800/60 border-slate-700/60">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex gap-1 mb-4">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}</div>
                  <p className="text-slate-200 mb-4 italic leading-relaxed">"{t.quote}"</p>
                  <div>
                    <div className="font-semibold text-white">{t.name}</div>
                    <div className="text-sm text-slate-400">{t.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4">Bảng giá đơn giản, minh bạch</h2>
            <p className="text-slate-300 text-base sm:text-lg">Chọn gói phù hợp với quy mô đội xe của bạn</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {PLANS.map((p) => (
              <Card key={p.name} className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-2 ${p.highlight ? 'bg-slate-800 border-blue-500 shadow-xl shadow-blue-500/15 ring-1 ring-blue-500/30' : 'bg-slate-800/60 border-slate-700/60'}`}>
                {p.highlight && (
                  <div className="absolute top-0 left-0 right-0 bg-blue-600 text-center text-xs font-bold py-1.5 text-white tracking-wide">PHỔ BIẾN NHẤT</div>
                )}
                <CardContent className={`p-5 sm:p-6 ${p.highlight ? 'pt-10' : ''}`}>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{p.name}</h3>
                  <div className="flex items-end gap-1 mb-6">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white">{p.price}</span>
                    <span className="text-slate-300 pb-1 font-medium">{p.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-white text-sm font-medium">
                        <Check className="w-4 h-4 text-green-400 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button className={`w-full h-11 font-semibold ${p.highlight ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`} asChild>
                    <Link to={p.name === 'Enterprise' ? '#' : '/auth'} onClick={(e) => { if (p.name === 'Enterprise') { e.preventDefault(); window.open('https://cal.com/fleetpro-app/30min', '_blank'); } }}>
                      {p.cta} <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-5 sm:mb-6">Sẵn sàng số hóa đội xe?</h2>
          <p className="text-slate-300 text-base sm:text-lg mb-6 sm:mb-8">Đăng ký dùng thử miễn phí ngay hôm nay. Không cần thẻ tín dụng, không ràng buộc.</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-base sm:text-lg h-12 sm:h-14 px-8 sm:px-10 shadow-lg shadow-blue-500/25 font-semibold" asChild>
              <Link to="/auth">Bắt đầu miễn phí <ArrowRight className="w-5 h-5 ml-2" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-white/10 text-base sm:text-lg h-12 sm:h-14 px-8 font-semibold" asChild>
              <a href="https://cal.com/fleetpro-app/30min" target="_blank" rel="noopener noreferrer">
                <Calendar className="w-5 h-5 mr-2" /> Đặt lịch tư vấn 30p
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 sm:py-12 px-4 bg-slate-950/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center font-bold text-sm">FP</div>
              <span className="font-bold text-white">FleetPro</span>
              <span className="text-slate-400 text-sm ml-2">© 2026 TNC Solutions</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
              <a href="mailto:contact@tnc.io.vn" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors font-medium">
                <Mail className="w-4 h-4" /> contact@tnc.io.vn
              </a>
              <a href="https://zalo.me/0989890022" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors font-medium">
                <MessageCircle className="w-4 h-4" /> Zalo: 098.989.0022
              </a>
              <a href="https://cal.com/fleetpro-app/30min" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors font-medium">
                <Calendar className="w-4 h-4" /> Đặt lịch tư vấn
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Zalo Button */}
      <a
        href="https://zalo.me/0989890022"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-blue-600/30 transition-all duration-300 hover:scale-110"
        title="Chat Zalo tư vấn"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    </div>
  );
}
