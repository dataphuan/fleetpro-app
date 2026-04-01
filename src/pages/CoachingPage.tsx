import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Calendar,
  MessageCircle,
  Users,
  Star,
  Phone,
  Mail,
  Send,
  Facebook,
  MessageSquare,
  Share2,
  Clock,
  Target,
  Zap,
} from 'lucide-react';
import './CoachingPage.css';

export const CoachingPage: React.FC = () => {
  const [selectedPackage, setSelectedPackage] = useState('30min');

  const handleBooking = (duration: string) => {
    // Redirect to Cal.com booking
    window.open(`https://cal.com/fleetpro-app/${duration}`, '_blank');
  };

  return (
    <div className="coaching-page">
      {/* HERO SECTION */}
      <section
        className="hero-section"
        style={{
          backgroundImage: 'url(https://fleetup.com/wp-content/uploads/2022/03/trip-sharing-history.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              🎯 Tư Vấn Chiến Lược<br />
              <span className="gradient-text">Quản Lý Vận Tải</span>
            </h1>
            <p className="hero-subtitle">
              Nhận tư vấn trực tiếp từ chuyên gia về cách tối ưu hóa công ty vận tải của bạn.
              Tăng doanh thu, giảm chi phí, quản lý hiệu quả.
            </p>

            <div className="hero-stats">
              <div className="stat">
                <div className="stat-number">200+</div>
                <div className="stat-label">Công ty tư vấn thành công</div>
              </div>
              <div className="stat">
                <div className="stat-number">4.9★</div>
                <div className="stat-label">Đánh giá từ khách hàng</div>
              </div>
              <div className="stat">
                <div className="stat-number">15 năm</div>
                <div className="stat-label">Kinh nghiệm ngành</div>
              </div>
            </div>

            <div className="hero-ctas">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => handleBooking('30min')}
              >
                📅 Đặt Lịch Tư Vấn Ngay
                <ArrowRight className="w-5 h-5" />
              </button>
              <a href="#packages" className="btn btn-secondary btn-lg">
                <MessageSquare className="w-5 h-5" />
                Xem Gói Tư Vấn
              </a>
            </div>

            <p className="hero-subtext">
              ✅ Tư vấn miễn phí lần đầu &nbsp; ✅ Lịch linh hoạt &nbsp; ✅ Support 24/7
            </p>
          </div>
        </div>
      </section>

      {/* ABOUT COACH SECTION */}
      <section className="coach-section">
        <div className="container">
          <div className="coach-card">
            <div className="coach-avatar">👨‍💼</div>
            <h2>Về Tư Vấn Viên</h2>
            <p className="coach-title">Chuyên Gia Quản Lý Vận Tải - FleetPro</p>
            <p className="coach-bio">
              Với hơn 15 năm kinh nghiệm trong ngành vận tải, tôi đã giúp hơn 200 công ty
              tối ưu hóa quy trình, giảm chi phí, và tăng doanh thu. Tư vấn dựa trên kinh
              nghiệm thực tế từ các dự án mở rộng quy mô từ 5 chiếc xe lên 100+ chiếc.
            </p>
            <div className="coach-stats">
              <div className="coach-stat">
                <div className="coach-stat-value">200+</div>
                <div className="coach-stat-label">Công ty tư vấn</div>
              </div>
              <div className="coach-stat">
                <div className="coach-stat-value">$50M+</div>
                <div className="coach-stat-label">Doanh thu giúp tăng</div>
              </div>
              <div className="coach-stat">
                <div className="coach-stat-value">$20M+</div>
                <div className="coach-stat-label">Chi phí giúp giảm</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PACKAGES SECTION */}
      <section className="packages-section" id="packages">
        <div className="container">
          <h2>📦 Gói Tư Vấn</h2>
          <p className="section-subtitle">Chọn gói phù hợp với nhu cầu công ty bạn</p>

          <div className="packages-grid">
            <div className="package-card">
              <div className="package-header">
                <h3>Tư Vấn Nhanh</h3>
                <p className="duration">30 phút</p>
              </div>
              <p className="package-price">$30</p>
              <p className="package-description">Giải đáp câu hỏi cụ thể</p>
              <ul className="package-features">
                <li>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Video call 30 phút</span>
                </li>
                <li>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Giải đáp 1-2 câu hỏi chính</span>
                </li>
                <li>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Gợi ý giải pháp sơ bộ</span>
                </li>
                <li className="unavailable">
                  <span>❌</span>
                  <span>Phân tích chi tiết</span>
                </li>
                <li className="unavailable">
                  <span>❌</span>
                  <span>Follow-up session</span>
                </li>
              </ul>
              <button
                className="btn btn-outline btn-full"
                onClick={() => handleBooking('30min')}
              >
                Đặt Lịch 30 Phút
              </button>
            </div>

            <div className="package-card package-card-featured">
              <div className="package-badge">⭐ PHỔ BIẾN NHẤT</div>
              <div className="package-header">
                <h3>Tư Vấn Chuyên Sâu</h3>
                <p className="duration">1 giờ</p>
              </div>
              <p className="package-price">$60</p>
              <p className="package-description">Phân tích toàn diện công ty</p>
              <ul className="package-features">
                <li>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Video call 1 giờ</span>
                </li>
                <li>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Phân tích chi tiết hệ thống hiện tại</span>
                </li>
                <li>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Roadmap tối ưu hóa 3-6 tháng</span>
                </li>
                <li>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>1 buổi follow-up miễn phí</span>
                </li>
                <li className="unavailable">
                  <span>❌</span>
                  <span>Hỗ trợ triển khai</span>
                </li>
              </ul>
              <button
                className="btn btn-primary btn-full"
                onClick={() => handleBooking('1h')}
              >
                Đặt Lịch 1 Giờ
              </button>
            </div>

            <div className="package-card">
              <div className="package-header">
                <h3>Tư Vấn Toàn Diện</h3>
                <p className="duration">2 giờ</p>
              </div>
              <p className="package-price">$120</p>
              <p className="package-description">Giải pháp hoàn chỉnh</p>
              <ul className="package-features">
                <li>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>2 buổi call (mỗi buổi 1 giờ)</span>
                </li>
                <li>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Phân tích chi tiết toàn bộ hệ thống</span>
                </li>
                <li>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Document chiến lược cụ thể</span>
                </li>
                <li>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>2 buổi follow-up miễn phí</span>
                </li>
                <li>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Chat support 7 ngày</span>
                </li>
              </ul>
              <button className="btn btn-secondary btn-full">
                Đặt Lịch 2 Giờ
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="benefits-section">
        <div className="container">
          <h2>✨ Bạn Sẽ Nhận Được Gì?</h2>

          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">🎯</div>
              <h3>Phân Tích Hiện Trạng</h3>
              <p>Đánh giá chi tiết tình hình hiện tại của công ty bạn</p>
              <ul>
                <li>Quy trình quản lý hiện tại</li>
                <li>Những điểm yếu và điểm mạnh</li>
                <li>Cơ hội cải thiện</li>
              </ul>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">🗺️</div>
              <h3>Roadmap Cụ Thể</h3>
              <p>Kế hoạch chi tiết để tối ưu hóa công ty</p>
              <ul>
                <li>Các bước thực hiện rõ ràng</li>
                <li>Timeline thực tế</li>
                <li>KPIs để đo lường tiến độ</li>
              </ul>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">💡</div>
              <h3>Giải Pháp Công Nghệ</h3>
              <p>Khuyến nghị công cụ và công nghệ phù hợp</p>
              <ul>
                <li>Phần mềm quản lý phù hợp</li>
                <li>Tích hợp hệ thống tối ưu</li>
                <li>Automation để tiết kiệm thời gian</li>
              </ul>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">📊</div>
              <h3>Dự Báo Tài Chính</h3>
              <p>Ước tính chi phí tiết kiệm & doanh thu tăng</p>
              <ul>
                <li>ROI chi tiết theo từng bước</li>
                <li>Thời gian điểm hòa vốn</li>
                <li>Lợi nhuận tăng dự kiến</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials-section">
        <div className="container">
          <h2>⭐ Lời Nhận Xét Từ Khách Hàng</h2>

          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="testimonial-text">
                "Buổi tư vấn với anh rất hữu ích. Chỉ với một số gợi ý nhỏ, công ty tôi đã
                giảm chi phí xăng 15% ngay trong tháng đầu tiên!"
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">👨‍💼</div>
                <div>
                  <p className="author-name">Nguyễn Văn A</p>
                  <p className="author-title">Chủ - Công Ty Vận Tải ABC</p>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="testimonial-text">
                "Kiến thức của anh rất thực tiễn, không phải tư thuyết khô cằn. Sau tư vấn,
                team quản lý của tôi hoạt động hiệu quả hơn 30%."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">👩‍💼</div>
                <div>
                  <p className="author-name">Trần Thị B</p>
                  <p className="author-title">Giám Đốc - T&L Express</p>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="testimonial-text">
                "Đáng giá từng đồng! Roadmap mà anh đưa ra giúp công ty tôi tăng doanh thu
                25% và giảm chi phí 20% trong 6 tháng."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">👨‍💻</div>
                <div>
                  <p className="author-name">Lê Văn C</p>
                  <p className="author-title">Chủ - Logistics Online</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMUNITIES SECTION */}
      <section className="communities-section">
        <div className="container">
          <h2>👥 Tham Gia Cộng Đồng Hỗ Trợ</h2>
          <p className="section-subtitle">Kết nối với hàng trăm chủ công ty vận tải khác</p>

          <div className="communities-grid">
            <a
              href="https://www.facebook.com/groups/vibecodecoaching"
              target="_blank"
              rel="noopener noreferrer"
              className="community-card"
            >
              <div className="community-icon facebook">
                <Facebook className="w-8 h-8" />
              </div>
              <h3>Facebook Group</h3>
              <p>Trao đổi kinh nghiệm với cộng đồng</p>
              <p className="community-stats">5,000+ thành viên</p>
              <button className="btn btn-outline btn-sm">Tham Gia Ngay</button>
            </a>

            <a
              href="https://zalo.me/g/tdhmtu261"
              target="_blank"
              rel="noopener noreferrer"
              className="community-card"
            >
              <div className="community-icon zalo">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3>Zalo Group</h3>
              <p>Hỗ trợ nhanh, trao đổi hàng ngày</p>
              <p className="community-stats">3,000+ thành viên</p>
              <button className="btn btn-outline btn-sm">Tham Gia Ngay</button>
            </a>

            <a
              href="https://chat.whatsapp.com/E2SNci7FscqCi3i4yCUt2W"
              target="_blank"
              rel="noopener noreferrer"
              className="community-card"
            >
              <div className="community-icon whatsapp">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3>WhatsApp Group</h3>
              <p>Chat nhanh, chia sẻ tức thời</p>
              <p className="community-stats">2,000+ thành viên</p>
              <button className="btn btn-outline btn-sm">Tham Gia Ngay</button>
            </a>

            <a
              href="https://t.me/vibecodocoaching"
              target="_blank"
              rel="noopener noreferrer"
              className="community-card"
            >
              <div className="community-icon telegram">
                <Send className="w-8 h-8" />
              </div>
              <h3>Telegram Group</h3>
              <p>Thông báo tin tức, webinar miễn phí</p>
              <p className="community-stats">1,500+ thành viên</p>
              <button className="btn btn-outline btn-sm">Tham Gia Ngay</button>
            </a>
          </div>
        </div>
      </section>

      {/* CONTACT ADMIN */}
      <section className="contact-admin-section">
        <div className="container">
          <h2>💬 Liên Hệ Trực Tiếp Với Chúng Tôi</h2>

          <div className="contact-methods">
            <a
              href="https://zalo.me/0989890022"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-card"
            >
              <div className="contact-icon">📱</div>
              <h3>Zalo / Viber / WhatsApp</h3>
              <p>0989 890 022</p>
              <p className="contact-time">Phản hồi trong 30 phút</p>
            </a>

            <a
              href="https://t.me/victorchuyen"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-card"
            >
              <div className="contact-icon">✈️</div>
              <h3>Telegram Cá Nhân</h3>
              <p>@victorchuyen</p>
              <p className="contact-time">Chat 24/7</p>
            </a>

            <div className="contact-card">
              <div className="contact-icon">📧</div>
              <h3>Email</h3>
              <p>contact@tnc.io.vn</p>
              <p>support@tnc.io.vn</p>
              <p>info@tnc.io.vn</p>
              <p className="contact-time">Phản hồi trong 2 giờ</p>
            </div>

            <button
              className="contact-card btn-contact"
              onClick={() => handleBooking('30min')}
            >
              <div className="contact-icon">📅</div>
              <h3>Đặt Lịch Tư Vấn</h3>
              <p>Chọn thời gian phù hợp</p>
              <p className="contact-time">Lịch 24/7</p>
            </button>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="faq-section">
        <div className="container">
          <h2>❓ Câu Hỏi Thường Gặp</h2>

          <div className="faq-grid">
            <div className="faq-card">
              <h3>Tư vấn nghĩa là gì? Khác gì với hỗ trợ thông thường?</h3>
              <p>
                Tư vấn là những buổi call 1-1 sâu, nơi tôi phân tích toàn diện công ty bạn
                và đưa ra roadmap cụ thể. Không phải chỉ trả lời câu hỏi, mà là xây dựng chiến
                lược dài hạn.
              </p>
            </div>

            <div className="faq-card">
              <h3>Tôi nên chọn gói nào?</h3>
              <p>
                - <strong>30 phút</strong>: Có câu hỏi cụ thể muốn hỏi nhanh
                <br />- <strong>1 giờ</strong>: Muốn phân tích công ty & có roadmap 3-6 tháng
                <br />- <strong>2 giờ</strong>: Muốn giải pháp toàn diện + hỗ trợ chi tiết
              </p>
            </div>

            <div className="faq-card">
              <h3>Cách sử dụng Cal.com để đặt lịch?</h3>
              <p>
                Click nút "Đặt Lịch" → Chọn thời gian phù hợp → Nhập email → Xác nhận.
                Bạn sẽ nhận email xác nhận cuộc call, và link call sẽ được gửi trước 24h.
              </p>
            </div>

            <div className="faq-card">
              <h3>Nếu tôi là start-up, có gói nào phù hợp không?</h3>
              <p>
                Có! Gói "Tư Vấn Nhanh" (30 phút) phù hợp với start-up muốn hỏi cách khởi
                động. Hoặc liên hệ trực tiếp để thảo luận về gói custom.
              </p>
            </div>

            <div className="faq-card">
              <h3>Tôi có thể hủy cuộc call không?</h3>
              <p>
                Được! Hủy tối thiểu 24 giờ trước cuộc call để được hoàn tiền 100%.
                Nếu hủy sau 24h sẽ mất 50% tiền.
              </p>
            </div>

            <div className="faq-card">
              <h3>Sau cuộc tư vấn, bạn có tiếp tục hỗ trợ không?</h3>
              <p>
                Có session follow-up miễn phí theo gói. Ngoài ra bạn có thể tham gia các
                Facebook/Zalo Group để được support 24/7 từ cộng đồng.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="final-cta">
        <div className="container">
          <h2>🚀 Sẵn Sàng Tối Ưu Hóa Công Ty?</h2>
          <p>
            Hơn 200 chủ công ty vận tải đã tăng doanh thu và giảm chi phí thông qua tư vấn
            của chúng tôi.
          </p>

          <div className="cta-buttons">
            <button className="btn btn-primary btn-lg" onClick={() => handleBooking('30min')}>
              📅 Đặt Lịch Tư Vấn Ngay
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="https://zalo.me/0989890022"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-lg"
            >
              💬 Chat Qua Zalo
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CoachingPage;
