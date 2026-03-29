export type BlogMenuItem = {
  label: string;
  slug: string;
  description: string;
  keywords: string[];
};

export type BlogMenuGroup = {
  label: string;
  slug: string;
  description: string;
  items: BlogMenuItem[];
};

export type BlogMainMenuConfig = {
  primary: BlogMenuGroup[];
  featured: BlogMenuItem[];
  cta: {
    label: string;
    slug: string;
  };
};

export const blogMainMenuConfig: BlogMainMenuConfig = {
  primary: [
    {
      label: 'Giải pháp theo vấn đề',
      slug: 'giai-phap-van-de',
      description: 'Nhóm bài xử lý bài toán vận hành phổ biến của doanh nghiệp vận tải.',
      items: [
        {
          label: 'Điều phối xe thủ công',
          slug: 'dieu-phoi-xe-thu-cong',
          description: 'Chuẩn hóa quy trình điều xe, giảm phụ thuộc Excel/Zalo.',
          keywords: ['dieu phoi xe', 'quan ly xe tai', 'phan mem dieu xe']
        },
        {
          label: 'Thất thoát chi phí vận hành',
          slug: 'that-thoat-chi-phi-van-hanh',
          description: 'Kiểm soát nhiên liệu, cầu đường, chi phí chuyến theo thời gian thực.',
          keywords: ['chi phi van tai', 'kiem soat nhien lieu', 'quan ly chi phi chuyen']
        },
        {
          label: 'Thiếu dữ liệu ra quyết định',
          slug: 'thieu-du-lieu-ra-quyet-dinh',
          description: 'Xây dashboard vận tải theo tuyến, tài xế, phương tiện.',
          keywords: ['bao cao van tai', 'dashboard van tai', 'phan tich du lieu doi xe']
        }
      ]
    },
    {
      label: 'Chức năng chính',
      slug: 'chuc-nang-chinh',
      description: 'Cụm nội dung xoay quanh tính năng lõi của hệ thống PM vận tải.',
      items: [
        {
          label: 'Quản lý lộ trình',
          slug: 'quan-ly-lo-trinh',
          description: 'Tối ưu tuyến, giảm rỗng xe, tăng vòng quay phương tiện.',
          keywords: ['toi uu lo trinh', 'quan ly tuyen xe', 'giam quang duong rong']
        },
        {
          label: 'Điều phối đơn hàng - phương tiện - tài xế',
          slug: 'dieu-phoi-don-hang-phuong-tien-tai-xe',
          description: 'Liên kết đơn hàng và năng lực xe/tài xế theo ca.',
          keywords: ['dieu xe', 'phan cong tai xe', 'quan ly don van chuyen']
        },
        {
          label: 'Báo cáo doanh thu - lợi nhuận - chi phí',
          slug: 'bao-cao-doanh-thu-loi-nhuan-chi-phi',
          description: 'Theo dõi biên lợi nhuận từng chuyến, từng khách hàng.',
          keywords: ['doanh thu van tai', 'loi nhuan chuyen xe', 'bao cao chi phi']
        }
      ]
    },
    {
      label: 'Lợi ích triển khai',
      slug: 'loi-ich-trien-khai',
      description: 'Các bài viết chứng minh hiệu quả sau khi ứng dụng phần mềm vận tải.',
      items: [
        {
          label: 'Tối ưu tài nguyên đội xe',
          slug: 'toi-uu-tai-nguyen-doi-xe',
          description: 'Nâng tỷ lệ sử dụng xe và giảm thời gian xe nhàn rỗi.',
          keywords: ['hieu suat doi xe', 'toi uu tai nguyen van tai']
        },
        {
          label: 'Nâng cao năng lực cạnh tranh',
          slug: 'nang-cao-nang-luc-canh-tranh',
          description: 'Tăng tốc độ phản hồi khách hàng và minh bạch vận hành.',
          keywords: ['chuyen doi so van tai', 'nang cao canh tranh logistics']
        },
        {
          label: 'Case study thực tế',
          slug: 'case-study-thuc-te',
          description: 'Bài toán trước/sau triển khai với số liệu định lượng.',
          keywords: ['case study van tai', 'ung dung phan mem van tai']
        }
      ]
    }
  ],
  featured: [
    {
      label: 'Phần mềm vận tải là gì?',
      slug: 'phan-mem-van-tai-la-gi',
      description: 'Bài nền tảng cho người mới tìm hiểu, dùng làm entry SEO chính.',
      keywords: ['phan mem van tai', 'pmvt', 'quan ly van tai']
    },
    {
      label: 'Checklist chọn phần mềm vận tải cho doanh nghiệp',
      slug: 'checklist-chon-phan-mem-van-tai',
      description: 'Danh sách tiêu chí chọn giải pháp phù hợp theo quy mô đội xe.',
      keywords: ['chon phan mem van tai', 'tieu chi pm van tai']
    }
  ],
  cta: {
    label: 'Nhận tư vấn giải pháp',
    slug: 'nhan-tu-van-giai-phap'
  }
};
