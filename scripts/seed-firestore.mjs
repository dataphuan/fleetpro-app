#!/usr/bin/env node
/**
 * Seed Firestore with test data using Firebase Admin SDK
 * Run: node scripts/seed-firestore.mjs
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'fleetpro-app-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();
const now = new Date().toISOString();

console.log(`🚀 Seeding Firestore for project: ${serviceAccount.project_id}\n`);

// ========== TEST DATA ==========
const VEHICLES = [
  {id:'XE001', vehicle_code:'XE001', license_plate:'51C-123.45', vehicle_type:'Xe tải thùng', brand:'Hino', model:'FC9J', year_manufactured:2022, capacity_tons:8, capacity_cbm:45, fuel_type:'Diesel', status:'active', notes:'Xe chính tuyến Bắc-Nam'},
  {id:'XE002', vehicle_code:'XE002', license_plate:'51C-234.56', vehicle_type:'Xe container 20ft', brand:'Isuzu', model:'FVR34', year_manufactured:2021, capacity_tons:15, capacity_cbm:33, fuel_type:'Diesel', status:'active', notes:'Container tuyến HCM-ĐN'},
  {id:'XE003', vehicle_code:'XE003', license_plate:'30H-567.89', vehicle_type:'Xe tải đông lạnh', brand:'Hyundai', model:'HD120', year_manufactured:2023, capacity_tons:5, capacity_cbm:25, fuel_type:'Diesel', status:'active', notes:'Chuyên chở hàng lạnh'},
  {id:'XE004', vehicle_code:'XE004', license_plate:'43C-111.22', vehicle_type:'Đầu kéo', brand:'Daewoo', model:'P9CEF', year_manufactured:2020, capacity_tons:20, capacity_cbm:0, fuel_type:'Diesel', status:'active', notes:'Đầu kéo sơmi rơmooc'},
  {id:'XE005', vehicle_code:'XE005', license_plate:'51C-333.44', vehicle_type:'Xe tải thùng', brand:'Mitsubishi', model:'Canter', year_manufactured:2024, capacity_tons:3.5, capacity_cbm:18, fuel_type:'Diesel', status:'active', notes:'Giao hàng nội thành'},
  {id:'XE006', vehicle_code:'XE006', license_plate:'51C-555.66', vehicle_type:'Xe tải ben', brand:'Thaco', model:'FD850', year_manufactured:2019, capacity_tons:8.5, capacity_cbm:10, fuel_type:'Diesel', status:'maintenance', notes:'Đang bảo dưỡng lớn'},
  {id:'XE007', vehicle_code:'XE007', license_plate:'29C-777.88', vehicle_type:'Xe tải thùng', brand:'Hino', model:'500 Series', year_manufactured:2023, capacity_tons:10, capacity_cbm:50, fuel_type:'Diesel', status:'active', notes:'Tuyến HN-HP'},
  {id:'XE008', vehicle_code:'XE008', license_plate:'51C-999.00', vehicle_type:'Xe container 40ft', brand:'Isuzu', model:'GXR', year_manufactured:2022, capacity_tons:22, capacity_cbm:67, fuel_type:'Diesel', status:'inactive', notes:'Container cỡ lớn - tạm ngưng khai thác'}
];

const DRIVERS = [
  {id:'TX001', driver_code:'TX001', full_name:'Nguyễn Văn An', email:'an.nguyen@fleetpro.vn', phone:'0909123456', id_card:'079090012345', license_number:'B2-123456', license_class:'C', license_expiry:'2028-12-31', address:'123 Nguyễn Huệ, Q.1, TP.HCM', status:'active', base_salary:12000000, notes:'Tài xế chính tuyến Bắc Nam'},
  {id:'TX002', driver_code:'TX002', full_name:'Trần Văn Bình', email:'binh.tran@fleetpro.vn', phone:'0909234567', id_card:'079090023456', license_number:'FC-234567', license_class:'FC', license_expiry:'2029-06-30', address:'456 Lê Lợi, Q.3, TP.HCM', status:'active', base_salary:15000000, notes:'Lái container'},
  {id:'TX003', driver_code:'TX003', full_name:'Phạm Minh Cường', email:'cuong.pham@fleetpro.vn', phone:'0909345678', id_card:'079090034567', license_number:'C-345678', license_class:'C', license_expiry:'2026-05-15', address:'789 Trần Hưng Đạo, Q.5, TP.HCM', status:'active', base_salary:10000000, notes:'GPLX sắp hết hạn - cần gia hạn'},
  {id:'TX004', driver_code:'TX004', full_name:'Lê Hoàng Dũng', email:'dung.le@fleetpro.vn', phone:'0909456789', id_card:'079090045678', license_number:'FC-456789', license_class:'FC', license_expiry:'2030-03-20', address:'12 Hai Bà Trưng, Q.1, TP.HCM', status:'active', base_salary:14000000, notes:'Đầu kéo container'},
  {id:'TX005', driver_code:'TX005', full_name:'Võ Thanh Hải', email:'hai.vo@fleetpro.vn', phone:'0909567890', id_card:'079090056789', license_number:'B2-567890', license_class:'C', license_expiry:'2027-09-10', address:'34 Pasteur, Q.3, TP.HCM', status:'on_leave', base_salary:10000000, notes:'Đang nghỉ phép'},
  {id:'TX006', driver_code:'TX006', full_name:'Đỗ Quang Khải', email:'khai.do@fleetpro.vn', phone:'0909678901', id_card:'079090067890', license_number:'C-678901', license_class:'C', license_expiry:'2028-11-25', address:'56 CMT8, Q.10, TP.HCM', status:'active', base_salary:11000000, notes:'Giao hàng nội thành + liên tỉnh'}
];

const CUSTOMERS = [
  {id:'KH001', customer_code:'KH001', customer_name:'Công ty TNHH ABC Trading', tax_code:'0312345678', address:'123 Nguyễn Văn Linh, Q.7, TP.HCM', phone:'02839001234', email:'sales@abctrading.vn', contact_person:'Nguyễn Văn Minh', payment_terms:30, credit_limit:100000000, notes:'Khách VIP - hàng điện tử'},
  {id:'KH002', customer_code:'KH002', customer_name:'CTCP Thực phẩm Sài Gòn', tax_code:'0301234567', address:'456 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM', phone:'02838001234', email:'logistics@sgfood.vn', contact_person:'Trần Thị Lan', payment_terms:15, credit_limit:200000000, notes:'Hàng thực phẩm đông lạnh'},
  {id:'KH003', customer_code:'KH003', customer_name:'Công ty TNHH Xây dựng Đại Phát', tax_code:'0309876543', address:'78 Quốc Lộ 1A, Q.12, TP.HCM', phone:'02836001234', email:'vantai@daiphat.vn', contact_person:'Lê Văn Tùng', payment_terms:45, credit_limit:500000000, notes:'Vật liệu xây dựng - khối lượng lớn'},
  {id:'KH004', customer_code:'KH004', customer_name:'CTCP Nội thất Hòa Phát', tax_code:'0100100010', address:'Khu CN Phú Mỹ, Bà Rịa - Vũng Tàu', phone:'02546001234', email:'shipping@hoaphat.vn', contact_person:'Phạm Đức Anh', payment_terms:30, credit_limit:300000000, notes:'Nội thất văn phòng'},
  {id:'KH005', customer_code:'KH005', customer_name:'Công ty TNHH Dệt may Thành Công', tax_code:'0300500123', address:'21 Tây Thạnh, Q.Tân Phú, TP.HCM', phone:'02835001234', email:'export@thanhcong.vn', contact_person:'Hoàng Thị Mai', payment_terms:30, credit_limit:150000000, notes:'Hàng xuất khẩu container'},
  {id:'KH006', customer_code:'KH006', customer_name:'Công ty TNHH Savico', tax_code:'4201234567', address:'Nhà máy Ninh Thủy, Khánh Hòa', phone:'02583801234', email:'logistics@savico.vn', contact_person:'Trần Văn Hùng', payment_terms:30, credit_limit:400000000, notes:'Ngành dăm gỗ - vận chuyển về nhà máy Ninh Thủy, chuyên xe thùng và container'}
];

const ROUTES = [
  {id:'TD001', route_code:'TD001', route_name:'HCM → Hà Nội', origin:'TP.HCM', destination:'Hà Nội', distance_km:1730, estimated_duration_hours:36, toll_cost:800000, standard_freight_rate:25000000, notes:'Tuyến Bắc Nam - Quốc Lộ 1A'},
  {id:'TD002', route_code:'TD002', route_name:'HCM → Đà Nẵng', origin:'TP.HCM', destination:'Đà Nẵng', distance_km:850, estimated_duration_hours:18, toll_cost:400000, standard_freight_rate:12000000, notes:'Tuyến miền Trung'},
  {id:'TD003', route_code:'TD003', route_name:'HCM → Cần Thơ', origin:'TP.HCM', destination:'Cần Thơ', distance_km:170, estimated_duration_hours:4, toll_cost:150000, standard_freight_rate:5000000, notes:'Tuyến miền Tây'},
  {id:'TD004', route_code:'TD004', route_name:'HCM → Bình Dương', origin:'TP.HCM', destination:'Bình Dương', distance_km:35, estimated_duration_hours:1.5, toll_cost:0, standard_freight_rate:2500000, notes:'Nội vùng - KCN VSIP/Mỹ Phước'},
  {id:'TD005', route_code:'TD005', route_name:'HCM → Vũng Tàu', origin:'TP.HCM', destination:'Vũng Tàu', distance_km:120, estimated_duration_hours:2.5, toll_cost:200000, standard_freight_rate:4000000, notes:'Cảng Cái Mép - hàng xuất nhập'},
  {id:'TD006', route_code:'TD006', route_name:'Hà Nội → Hải Phòng', origin:'Hà Nội', destination:'Hải Phòng', distance_km:120, estimated_duration_hours:2.5, toll_cost:250000, standard_freight_rate:4500000, notes:'Cảng HP - container'},
  {id:'TD007', route_code:'TD007', route_name:'HCM → Long An', origin:'TP.HCM', destination:'Long An', distance_km:50, estimated_duration_hours:1.5, toll_cost:0, standard_freight_rate:2000000, notes:'KCN Long Hậu'},
  {id:'TD008', route_code:'TD008', route_name:'Nội thành HCM', origin:'Q.7, HCM', destination:'Q.12, HCM', distance_km:25, estimated_duration_hours:1, toll_cost:0, standard_freight_rate:1500000, notes:'Giao hàng nội thành'},
  {id:'TD009', route_code:'TD009', route_name:'HCM → Phú Yên', origin:'TP.HCM', destination:'Phú Yên', distance_km:450, estimated_duration_hours:10, toll_cost:180000, standard_freight_rate:8500000, notes:'Tuyến Phú Yên - dăm gỗ'},
  {id:'TD010', route_code:'TD010', route_name:'Đắk Nông → Ninh Thủy', origin:'Đắk Nông', destination:'Ninh Thủy, Khánh Hòa', distance_km:280, estimated_duration_hours:6, toll_cost:120000, standard_freight_rate:6500000, notes:'Dăm gỗ Đắk Nông về nhà máy Savico'},
  {id:'TD011', route_code:'TD011', route_name:'Nha Trang → Ninh Thuận', origin:'Nha Trang', destination:'Ninh Thuận', distance_km:150, estimated_duration_hours:3.5, toll_cost:80000, standard_freight_rate:4200000, notes:'Tuyến ven biển Nam Trung Bộ'},
  {id:'TD012', route_code:'TD012', route_name:'Cảng Cà Ná → Ninh Thủy', origin:'Cảng Cà Ná', destination:'Ninh Thủy, Khánh Hòa', distance_km:80, estimated_duration_hours:2, toll_cost:50000, standard_freight_rate:2800000, notes:'Cảng Cà Ná - hàng nhập khẩu dăm gỗ'},
  {id:'TD013', route_code:'TD013', route_name:'Phú Yên → Ninh Thủy', origin:'Phú Yên', destination:'Ninh Thủy, Khánh Hòa', distance_km:120, estimated_duration_hours:3, toll_cost:60000, standard_freight_rate:3500000, notes:'Dăm gỗ Phú Yên về Savico'},
  {id:'TD014', route_code:'TD014', route_name:'Đà Lạt → Ninh Thủy', origin:'Đà Lạt', destination:'Ninh Thủy, Khánh Hòa', distance_km:180, estimated_duration_hours:4.5, toll_cost:100000, standard_freight_rate:4800000, notes:'Tuyến Lâm Đồng - Khánh Hòa'}
];

// 15 TRIPS across Jan-Mar 2026
const TRIPS = [
  {id:'CD26010001', trip_code:'CD26010001', vehicle_id:'XE001', vehicle_plate:'51C-123.45', driver_id:'TX001', driver_name:'Nguyễn Văn An', route_id:'TD001', customer_id:'KH001', customer_name:'Công ty TNHH ABC Trading', departure_date:'2026-01-05', total_revenue:25000000, status:'closed', closed_at:'2026-01-07T18:00:00Z', notes:'Hàng điện tử HCM-HN'},
  {id:'CD26010002', trip_code:'CD26010002', vehicle_id:'XE002', vehicle_plate:'51C-234.56', driver_id:'TX002', driver_name:'Trần Văn Bình', route_id:'TD002', customer_id:'KH005', customer_name:'Công ty TNHH Dệt may Thành Công', departure_date:'2026-01-10', total_revenue:13000000, status:'closed', closed_at:'2026-01-11T20:00:00Z', notes:'Container vải xuất khẩu'},
  {id:'CD26010003', trip_code:'CD26010003', vehicle_id:'XE003', vehicle_plate:'30H-567.89', driver_id:'TX003', driver_name:'Phạm Minh Cường', route_id:'TD003', customer_id:'KH002', customer_name:'CTCP Thực phẩm Sài Gòn', departure_date:'2026-01-15', total_revenue:5500000, status:'closed', closed_at:'2026-01-15T16:00:00Z', notes:'Thực phẩm đông lạnh'},
  {id:'CD26010004', trip_code:'CD26010004', vehicle_id:'XE005', vehicle_plate:'51C-333.44', driver_id:'TX006', driver_name:'Đỗ Quang Khải', route_id:'TD008', customer_id:'KH004', customer_name:'CTCP Nội thất Hòa Phát', departure_date:'2026-01-20', total_revenue:1800000, status:'closed', closed_at:'2026-01-20T14:00:00Z', notes:'Nội thất giao nội thành'},
  {id:'CD26010005', trip_code:'CD26010005', vehicle_id:'XE004', vehicle_plate:'43C-111.22', driver_id:'TX004', driver_name:'Lê Hoàng Dũng', route_id:'TD005', customer_id:'KH003', customer_name:'Công ty TNHH Xây dựng Đại Phát', departure_date:'2026-01-25', total_revenue:8000000, status:'closed', closed_at:'2026-01-25T18:00:00Z', notes:'VLXD cảng Cái Mép'},
  {id:'CD26020001', trip_code:'CD26020001', vehicle_id:'XE001', vehicle_plate:'51C-123.45', driver_id:'TX001', driver_name:'Nguyễn Văn An', route_id:'TD001', customer_id:'KH001', customer_name:'Công ty TNHH ABC Trading', departure_date:'2026-02-03', total_revenue:26000000, status:'closed', closed_at:'2026-02-05T19:00:00Z', notes:'Lô hàng điện tử tháng 2'},
  {id:'CD26020002', trip_code:'CD26020002', vehicle_id:'XE007', vehicle_plate:'29C-777.88', driver_id:'TX006', driver_name:'Đỗ Quang Khải', route_id:'TD006', customer_id:'KH004', customer_name:'CTCP Nội thất Hòa Phát', departure_date:'2026-02-10', total_revenue:5000000, status:'closed', closed_at:'2026-02-10T17:00:00Z', notes:'Container HN-HP'},
  {id:'CD26020003', trip_code:'CD26020003', vehicle_id:'XE003', vehicle_plate:'30H-567.89', driver_id:'TX003', driver_name:'Phạm Minh Cường', route_id:'TD003', customer_id:'KH002', customer_name:'CTCP Thực phẩm Sài Gòn', departure_date:'2026-02-14', total_revenue:5500000, status:'dispatched', dispatched_at:'2026-02-14T06:00:00Z', notes:'Thực phẩm Tết'},
  {id:'CD26020004', trip_code:'CD26020004', vehicle_id:'XE002', vehicle_plate:'51C-234.56', driver_id:'TX002', driver_name:'Trần Văn Bình', route_id:'TD004', customer_id:'KH003', customer_name:'Công ty TNHH Xây dựng Đại Phát', departure_date:'2026-02-20', total_revenue:3000000, status:'closed', closed_at:'2026-02-20T15:00:00Z', notes:'VLXD Bình Dương'},
  {id:'CD26020005', trip_code:'CD26020005', vehicle_id:'XE008', vehicle_plate:'51C-999.00', driver_id:'TX004', driver_name:'Lê Hoàng Dũng', route_id:'TD005', customer_id:'KH005', customer_name:'Công ty TNHH Dệt may Thành Công', departure_date:'2026-02-25', total_revenue:9000000, status:'closed', closed_at:'2026-02-25T20:00:00Z', notes:'Container vải cảng'},
  {id:'CD26030001', trip_code:'CD26030001', vehicle_id:'XE001', vehicle_plate:'51C-123.45', driver_id:'TX001', driver_name:'Nguyễn Văn An', route_id:'TD002', customer_id:'KH001', customer_name:'Công ty TNHH ABC Trading', departure_date:'2026-03-05', total_revenue:14000000, status:'in_progress', dispatched_at:'2026-03-05T05:30:00Z', actual_departure_time:'2026-03-05T06:00:00Z', notes:'Hàng HCM-ĐN tháng 3'},
  {id:'CD26030002', trip_code:'CD26030002', vehicle_id:'XE005', vehicle_plate:'51C-333.44', driver_id:'TX006', driver_name:'Đỗ Quang Khải', route_id:'TD007', customer_id:'KH003', customer_name:'Công ty TNHH Xây dựng Đại Phát', departure_date:'2026-03-10', total_revenue:2200000, status:'confirmed', notes:'VLXD Long An'},
  {id:'CD26030003', trip_code:'CD26030003', vehicle_id:'XE004', vehicle_plate:'43C-111.22', driver_id:'TX004', driver_name:'Lê Hoàng Dũng', route_id:'TD001', customer_id:'KH004', customer_name:'CTCP Nội thất Hòa Phát', departure_date:'2026-03-15', total_revenue:28000000, status:'completed', actual_departure_time:'2026-03-15T04:30:00Z', actual_arrival_time:'2026-03-16T20:30:00Z', notes:'Nội thất Bắc Nam'},
  {id:'CD26030004', trip_code:'CD26030004', vehicle_id:'XE003', vehicle_plate:'30H-567.89', driver_id:'TX003', driver_name:'Phạm Minh Cường', route_id:'TD003', customer_id:'KH002', customer_name:'CTCP Thực phẩm Sài Gòn', departure_date:'2026-03-20', total_revenue:6000000, status:'draft', notes:'Hàng lạnh Cần Thơ'},
  {id:'CD26030005', trip_code:'CD26030005', vehicle_id:'XE002', vehicle_plate:'51C-234.56', driver_id:'TX002', driver_name:'Trần Văn Bình', route_id:'TD002', customer_id:'KH005', customer_name:'Công ty TNHH Dệt may Thành Công', departure_date:'2026-03-25', total_revenue:13500000, status:'cancelled', cancelled_at:'2026-03-24T09:30:00Z', notes:'Vải xuất khẩu ĐN - khách dời lịch'},
  {id:'CD26030006', trip_code:'CD26030006', vehicle_id:'XE001', vehicle_plate:'51C-123.45', driver_id:'TX001', driver_name:'Nguyễn Văn An', route_id:'TD010', customer_id:'KH006', customer_name:'Công ty TNHH Savico', departure_date:'2026-03-08', total_revenue:6500000, status:'completed', actual_departure_time:'2026-03-08T07:00:00Z', actual_arrival_time:'2026-03-08T13:00:00Z', notes:'Dăm gỗ Đắk Nông về Ninh Thủy'},
  {id:'CD26030007', trip_code:'CD26030007', vehicle_id:'XE002', vehicle_plate:'51C-234.56', driver_id:'TX002', driver_name:'Trần Văn Bình', route_id:'TD013', customer_id:'KH006', customer_name:'Công ty TNHH Savico', departure_date:'2026-03-12', total_revenue:3500000, status:'completed', actual_departure_time:'2026-03-12T08:30:00Z', actual_arrival_time:'2026-03-12T11:30:00Z', notes:'Dăm gỗ Phú Yên về Savico'},
  {id:'CD26030008', trip_code:'CD26030008', vehicle_id:'XE008', vehicle_plate:'51C-999.00', driver_id:'TX004', driver_name:'Lê Hoàng Dũng', route_id:'TD012', customer_id:'KH006', customer_name:'Công ty TNHH Savico', departure_date:'2026-03-18', total_revenue:2800000, status:'in_progress', dispatched_at:'2026-03-18T06:00:00Z', notes:'Container dăm gỗ từ Cảng Cà Ná'}
];

// 25 EXPENSES linked to trips
const EXPENSES = [
  {id:'CP26010001', expense_code:'CP26010001', expense_date:'2026-01-05', category_id:'CAT01', trip_id:'CD26010001', vehicle_id:'XE001', description:'Đổ dầu chuyến HN 800L', amount:4800000, status:'confirmed'},
  {id:'CP26010002', expense_code:'CP26010002', expense_date:'2026-01-05', category_id:'CAT02', trip_id:'CD26010001', vehicle_id:'XE001', description:'Phí cầu đường QL1A', amount:850000, status:'confirmed'},
  {id:'CP26010003', expense_code:'CP26010003', expense_date:'2026-01-06', category_id:'CAT03', trip_id:'CD26010001', vehicle_id:'XE001', description:'Bốc xếp 2 đầu', amount:600000, status:'confirmed'},
  {id:'CP26010004', expense_code:'CP26010004', expense_date:'2026-01-06', category_id:'CAT06', trip_id:'CD26010001', vehicle_id:'XE001', description:'Ăn uống tài xế 2 ngày', amount:300000, status:'confirmed'},
  {id:'CP26010005', expense_code:'CP26010005', expense_date:'2026-01-10', category_id:'CAT01', trip_id:'CD26010002', vehicle_id:'XE002', description:'Dầu container ĐN', amount:2800000, status:'confirmed'},
  {id:'CP26010006', expense_code:'CP26010006', expense_date:'2026-01-10', category_id:'CAT02', trip_id:'CD26010002', vehicle_id:'XE002', description:'Cầu đường HCM-ĐN', amount:420000, status:'confirmed'},
  {id:'CP26010007', expense_code:'CP26010007', expense_date:'2026-01-15', category_id:'CAT01', trip_id:'CD26010003', vehicle_id:'XE003', description:'Dầu chuyến Cần Thơ', amount:600000, status:'confirmed'},
  {id:'CP26010008', expense_code:'CP26010008', expense_date:'2026-01-15', category_id:'CAT02', trip_id:'CD26010003', vehicle_id:'XE003', description:'Phí cầu đường CT', amount:160000, status:'confirmed'},
  {id:'CP26010009', expense_code:'CP26010009', expense_date:'2026-01-20', category_id:'CAT01', trip_id:'CD26010004', vehicle_id:'XE005', description:'Dầu giao nội thành', amount:250000, status:'confirmed'},
  {id:'CP26010010', expense_code:'CP26010010', expense_date:'2026-01-25', category_id:'CAT01', trip_id:'CD26010005', vehicle_id:'XE004', description:'Dầu Vũng Tàu', amount:1200000, status:'confirmed'},
  {id:'CP26010011', expense_code:'CP26010011', expense_date:'2026-01-25', category_id:'CAT02', trip_id:'CD26010005', vehicle_id:'XE004', description:'Cầu đường VT', amount:220000, status:'confirmed'},
  {id:'CP26010012', expense_code:'CP26010012', expense_date:'2026-01-25', category_id:'CAT03', trip_id:'CD26010005', vehicle_id:'XE004', description:'Bốc xếp cảng', amount:500000, status:'confirmed'},
  {id:'CP26020001', expense_code:'CP26020001', expense_date:'2026-02-03', category_id:'CAT01', trip_id:'CD26020001', vehicle_id:'XE001', description:'Dầu HN T2', amount:5000000, status:'confirmed'},
  {id:'CP26020002', expense_code:'CP26020002', expense_date:'2026-02-03', category_id:'CAT02', trip_id:'CD26020001', vehicle_id:'XE001', description:'Cầu đường T2', amount:880000, status:'confirmed'},
  {id:'CP26020003', expense_code:'CP26020003', expense_date:'2026-02-04', category_id:'CAT03', trip_id:'CD26020001', vehicle_id:'XE001', description:'Bốc xếp HN', amount:650000, status:'confirmed'},
  {id:'CP26020004', expense_code:'CP26020004', expense_date:'2026-02-04', category_id:'CAT06', trip_id:'CD26020001', vehicle_id:'XE001', description:'Phí qua đêm + ăn uống', amount:400000, status:'confirmed'},
  {id:'CP26020005', expense_code:'CP26020005', expense_date:'2026-02-10', category_id:'CAT01', trip_id:'CD26020002', vehicle_id:'XE007', description:'Dầu HN-HP', amount:800000, status:'confirmed'},
  {id:'CP26020006', expense_code:'CP26020006', expense_date:'2026-02-10', category_id:'CAT02', trip_id:'CD26020002', vehicle_id:'XE007', description:'Cao tốc HN-HP', amount:260000, status:'confirmed'},
  {id:'CP26020007', expense_code:'CP26020007', expense_date:'2026-02-20', category_id:'CAT01', trip_id:'CD26020004', vehicle_id:'XE002', description:'Dầu BD', amount:350000, status:'confirmed'},
  {id:'CP26020008', expense_code:'CP26020008', expense_date:'2026-02-25', category_id:'CAT01', trip_id:'CD26020005', vehicle_id:'XE008', description:'Dầu cảng VT', amount:1500000, status:'confirmed'},
  {id:'CP26020009', expense_code:'CP26020009', expense_date:'2026-02-25', category_id:'CAT02', trip_id:'CD26020005', vehicle_id:'XE008', description:'Phí cầu VT', amount:210000, status:'confirmed'},
  {id:'CP26020010', expense_code:'CP26020010', expense_date:'2026-02-25', category_id:'CAT03', trip_id:'CD26020005', vehicle_id:'XE008', description:'Bốc container', amount:800000, status:'confirmed'},
  {id:'CP26030001', expense_code:'CP26030001', expense_date:'2026-03-05', category_id:'CAT01', trip_id:'CD26030001', vehicle_id:'XE001', description:'Dầu ĐN T3', amount:2900000, status:'draft'},
  {id:'CP26030002', expense_code:'CP26030002', expense_date:'2026-03-10', category_id:'CAT01', trip_id:'CD26030002', vehicle_id:'XE005', description:'Dầu Long An', amount:300000, status:'draft'},
  {id:'CP26030003', expense_code:'CP26030003', expense_date:'2026-03-15', category_id:'CAT01', trip_id:'CD26030003', vehicle_id:'XE004', description:'Dầu dự kiến BN', amount:5200000, status:'draft'},
  {id:'CP26030004', expense_code:'CP26030004', expense_date:'2026-03-18', category_id:'CAT06', trip_id:'CD26030005', vehicle_id:'XE002', description:'Chi phí phát sinh bị hủy', amount:250000, status:'cancelled'}
];

const MAINTENANCE = [
  {id:'BT26010001', vehicle_id:'XE001', vehicle_plate:'51C-123.45', maintenance_type:'Bảo dưỡng định kỳ', maintenance_date:'2026-01-20', cost:2000000, currency:'VND', notes:'Thay nhớt + lọc dầu + lọc gió'},
  {id:'BT26020001', vehicle_id:'XE006', vehicle_plate:'51C-555.66', maintenance_type:'Sửa chữa lớn', maintenance_date:'2026-02-15', cost:10000000, currency:'VND', notes:'Đại tu máy + hộp số'},
  {id:'BT26030001', vehicle_id:'XE002', vehicle_plate:'51C-234.56', maintenance_type:'Bảo dưỡng định kỳ', maintenance_date:'2026-03-25', cost:2400000, currency:'VND', notes:'Thay nhớt + kiểm tra phanh'},
  {id:'BT26030002', vehicle_id:'XE003', vehicle_plate:'30H-567.89', maintenance_type:'Thay phụ tùng', maintenance_date:'2026-03-30', cost:3900000, currency:'VND', notes:'Thay bộ ly hợp'}
];

const EXPENSE_CATEGORIES = [
  {id:'CAT01', category_name:'Nhiên liệu', category_code:'FUEL', category_type:'variable', is_trip_related:1, is_vehicle_related:1, notes:'Xăng dầu cho xe'},
  {id:'CAT02', category_name:'Cầu đường', category_code:'TOLL', category_type:'variable', is_trip_related:1, is_vehicle_related:1, notes:'Phí cầu đường, cao tốc'},
  {id:'CAT03', category_name:'Bốc xếp', category_code:'LOADING', category_type:'variable', is_trip_related:1, is_vehicle_related:0, notes:'Chi phí bốc dỡ hàng'},
  {id:'CAT04', category_name:'Sửa chữa', category_code:'REPAIR', category_type:'variable', is_trip_related:0, is_vehicle_related:1, notes:'Sửa chữa xe đột xuất'},
  {id:'CAT05', category_name:'Lương tài xế', category_code:'SALARY', category_type:'fixed', is_trip_related:0, is_vehicle_related:0, notes:'Lương, phụ cấp tài xế'},
  {id:'CAT06', category_name:'Chi phí khác', category_code:'OTHER', category_type:'variable', is_trip_related:1, is_vehicle_related:1, notes:'Ăn uống, qua đêm, phí khác'}
];

const ACCOUNTING_PERIODS = [
  {id:'AP2026-01', name:'Tháng 01/2026', start_date:'2026-01-01', end_date:'2026-01-31', status:'closed', total_revenue:53300000, total_expense:12700000, note:'Kỳ kế toán T1 đã đóng'},
  {id:'AP2026-02', name:'Tháng 02/2026', start_date:'2026-02-01', end_date:'2026-02-28', status:'closed', total_revenue:48500000, total_expense:10850000, note:'Kỳ kế toán T2 đã đóng'},
  {id:'AP2026-03', name:'Tháng 03/2026', start_date:'2026-03-01', end_date:'2026-03-31', status:'open', total_revenue:0, total_expense:0, note:'Kỳ kế toán T3 đang mở'}
];

const COMPANY_SETTINGS = [
  {id:'default', company_name:'Công ty TNHH Vận tải FleetPro', tax_code:'0316789012', address:'88 Nguyễn Huệ, Q.1, TP.HCM', phone:'028 3999 8888', email:'info@fleetpro.vn', website:'https://fleetpro.vn', logo_url:'', currency:'VND', date_format:'DD/MM/YYYY'}
];

const TRANSPORT_ORDERS = [
  {id:'DH26030001', order_code:'DH26030001', customer_id:'KH001', route_id:'TD001', cargo_description:'Linh kiện điện tử 5 tấn', pickup_date:'2026-03-15', delivery_date:'2026-03-17', status:'in_progress', freight_amount:28000000, notes:'Cần xe thùng kín'},
  {id:'DH26030002', order_code:'DH26030002', customer_id:'KH002', route_id:'TD003', cargo_description:'Thực phẩm đông lạnh 3 tấn', pickup_date:'2026-03-20', delivery_date:'2026-03-20', status:'completed', freight_amount:6000000, notes:'Xe đông lạnh -18°C'},
  {id:'DH26030003', order_code:'DH26030003', customer_id:'KH003', route_id:'TD004', cargo_description:'Xi măng 15 tấn', pickup_date:'2026-03-22', delivery_date:'2026-03-22', status:'confirmed', freight_amount:3500000, notes:'Giao KCN Mỹ Phước'},
  {id:'DH26030004', order_code:'DH26030004', customer_id:'KH005', route_id:'TD005', cargo_description:'Container 40ft vải xuất khẩu', pickup_date:'2026-03-25', delivery_date:'2026-03-25', status:'pending', freight_amount:9500000, notes:'Cảng Cái Mép'},
  {id:'DH26030005', order_code:'DH26030005', customer_id:'KH004', route_id:'TD001', cargo_description:'Bàn ghế văn phòng 8 tấn', pickup_date:'2026-03-28', delivery_date:'2026-03-30', status:'cancelled', freight_amount:27000000, notes:'Đóng gói cẩn thận'},
  {id:'DH26030006', order_code:'DH26030006', customer_id:'KH006', route_id:'TD010', cargo_description:'Dăm gỗ 12 tấn từ Đắk Nông', pickup_date:'2026-03-08', delivery_date:'2026-03-08', status:'completed', freight_amount:6500000, notes:'Dăm gỗ nguyên liệu cho nhà máy'},
  {id:'DH26030007', order_code:'DH26030007', customer_id:'KH006', route_id:'TD013', cargo_description:'Dăm gỗ 8 tấn từ Phú Yên', pickup_date:'2026-03-12', delivery_date:'2026-03-12', status:'completed', freight_amount:3500000, notes:'Nguyên liệu dăm gỗ Phú Yên'},
  {id:'DH26030008', order_code:'DH26030008', customer_id:'KH006', route_id:'TD012', cargo_description:'Container 20ft dăm gỗ nhập khẩu', pickup_date:'2026-03-18', delivery_date:'2026-03-18', status:'in_progress', freight_amount:2800000, notes:'Hàng nhập từ Cảng Cà Ná'}
];

const TIRES = [
  {id:'TIRE001', item_id:'INV_TIRE_11R', serial_number:'SN001', brand:'Bridgestone', size:'11R22.5', current_status:'INSTALLED', status:'INSTALLED', current_vehicle_id:'XE001', installed_position:'Trước trái', total_km_run:95000, notes:'Lốp trước'},
  {id:'TIRE002', item_id:'INV_TIRE_11R', serial_number:'SN002', brand:'Bridgestone', size:'11R22.5', current_status:'INSTALLED', current_vehicle_id:'XE001', installed_position:'Trước phải', total_km_run:95000, notes:'Lốp trước'},
  {id:'TIRE003', item_id:'INV_TIRE_12R', serial_number:'SN003', brand:'Michelin', size:'12R22.5', current_status:'INSTALLED', current_vehicle_id:'XE002', installed_position:'Sau trái ngoài', total_km_run:62000, notes:'Lốp container'},
  {id:'TIRE004', item_id:'INV_TIRE_11R', serial_number:'SN004', brand:'Dunlop', size:'11R22.5', current_status:'IN_STOCK', current_vehicle_id:'', installed_position:'', total_km_run:0, notes:'Lốp dự phòng kho'},
  {id:'TIRE005', item_id:'INV_TIRE_11R', serial_number:'SN005', brand:'Bridgestone', size:'11R22.5', current_status:'IN_STOCK', current_vehicle_id:'', installed_position:'', total_km_run:0, notes:'Lốp dự phòng kho'},
  {id:'TIRE006', item_id:'INV_TIRE_12R', serial_number:'SN006', brand:'Michelin', size:'12R22.5', current_status:'AT_REPAIR', status:'AT_REPAIR', current_vehicle_id:'XE004', installed_position:'Sau phải trong', total_km_run:118000, notes:'Gần hết tuổi thọ!'}
];

const INVENTORY = [
  {id:'INV_OIL_1', item_code:'INV_OIL_1', name:'Nhớt máy Total 15W-40', category:'Dầu nhớt', unit:'Thùng 18L', current_stock:12, min_stock_level:5, average_cost:850000, total_value:10200000, notes:'Bảo dưỡng định kỳ'},
  {id:'INV_FLT_1', item_code:'INV_FLT_1', name:'Lọc dầu Hino FC9J', category:'Phụ tùng', unit:'Cái', current_stock:8, min_stock_level:4, average_cost:180000, total_value:1440000, notes:''},
  {id:'INV_FLT_2', item_code:'INV_FLT_2', name:'Lọc gió Donaldson P532966', category:'Phụ tùng', unit:'Cái', current_stock:6, min_stock_level:3, average_cost:350000, total_value:2100000, notes:'Tương thích Hino/Isuzu'},
  {id:'INV_BOLT', item_code:'INV_BOLT', name:'Bulong bánh xe M22x1.5', category:'Phụ tùng', unit:'Bộ 10', current_stock:20, min_stock_level:10, average_cost:95000, total_value:1900000, notes:''}
];

const PURCHASE_ORDERS = [
  {id:'PO26030001', po_code:'PO26030001', vendor_name:'Công ty Lốp Miền Nam', order_date:'2026-03-01', expected_date:'2026-03-05', total_amount:32500000, status:'completed', notes:'PO nhập lốp định kỳ'},
  {id:'PO26030002', po_code:'PO26030002', vendor_name:'Nhà cung cấp Phụ tùng Sài Gòn', order_date:'2026-03-12', expected_date:'2026-03-20', total_amount:9600000, status:'pending', notes:'PO chờ duyệt'},
  {id:'PO26030003', po_code:'PO26030003', vendor_name:'Total Lubricants', order_date:'2026-03-18', expected_date:'2026-03-22', total_amount:10200000, status:'cancelled', notes:'PO hủy do đổi NCC'}
];

const INVENTORY_TRANSACTIONS = [
  {id:'TXN26030001', transaction_code:'TXN26030001', transaction_date:'2026-03-02', type:'IN_NEW', item_id:'INV_OIL_1', quantity:8, unit_price:850000, total_price:6800000, notes:'Nhập nhớt lô mới'},
  {id:'TXN26030002', transaction_code:'TXN26030002', transaction_date:'2026-03-04', type:'OUT_INSTALL', item_id:'INV_FLT_1', quantity:2, unit_price:180000, total_price:360000, reference_id:'BT26030001', notes:'Xuất thay lọc dầu'},
  {id:'TXN26030003', transaction_code:'TXN26030003', transaction_date:'2026-03-10', type:'ADJUSTMENT', item_id:'INV_BOLT', quantity:-1, unit_price:95000, total_price:-95000, notes:'Điều chỉnh hao hụt kho'}
];

const TRIP_EXPENSES = [
  {id:'TE26010001', expense_id:'CP26010001', trip_id:'CD26010001', allocated_amount:4800000, allocation_percentage:100, notes:'Phân bổ full chuyến'},
  {id:'TE26010002', expense_id:'CP26010002', trip_id:'CD26010001', allocated_amount:850000, allocation_percentage:100, notes:'Phân bổ cầu đường'},
  {id:'TE26030001', expense_id:'CP26030001', trip_id:'CD26030001', allocated_amount:2900000, allocation_percentage:100, notes:'Dầu bổ sung chuyến tháng 3'}
];

const ALERTS = [
  {id:'AL26030001', alert_type:'expiry', title:'Đăng kiểm xe XE008 đã quá hạn', message:'Cần gia hạn đăng kiểm ngay', reference_id:'XE008', reference_type:'vehicle', severity:'high', is_read:0},
  {id:'AL26030002', alert_type:'maintenance', title:'Xe XE006 cần bảo trì lớn', message:'Đặt lịch bảo trì trong tuần này', reference_id:'XE006', reference_type:'vehicle', severity:'critical', is_read:0},
  {id:'AL26030003', alert_type:'warning', title:'Tài xế TX003 sắp hết hạn GPLX', message:'Gia hạn trước 2026-05-15', reference_id:'TX003', reference_type:'driver', severity:'medium', is_read:0}
];

const PARTNERS = [
  {id:'PTN001', partner_code:'PTN001', partner_name:'Garage Hoàng Long', partner_type:'maintenance', phone:'0908111222', address:'Q.12, TP.HCM', notes:'Đối tác bảo trì nhanh'},
  {id:'PTN002', partner_code:'PTN002', partner_name:'Lốp Miền Nam', partner_type:'supplier', phone:'0908333444', address:'Bình Tân, TP.HCM', notes:'NCC lốp chính'}
];

const USERS = [
  {id:'demo_admin', email:'demo.admin@fleetpro.vn', full_name:'Demo Admin', role:'admin', status:'active'},
  {id:'demo_manager', email:'demo.manager@fleetpro.vn', full_name:'Demo Manager', role:'manager', status:'active'},
  {id:'demo_dispatcher', email:'demo.dispatcher@fleetpro.vn', full_name:'Demo Dispatcher', role:'dispatcher', status:'active'},
  {id:'demo_accountant', email:'demo.accountant@fleetpro.vn', full_name:'Demo Accountant', role:'accountant', status:'active'},
  {id:'demo_driver', email:'demo.driver@fleetpro.vn', full_name:'Demo Driver', role:'driver', status:'active'},
  {id:'demo_viewer', email:'demo.viewer@fleetpro.vn', full_name:'Demo Viewer', role:'viewer', status:'active'}
];

// ========== SEED FUNCTIONS ==========
async function seedCollection(collectionName, items, tenantId = 'internal-tenant-1') {
  const batch = db.batch();
  let count = 0;

  for (const item of items) {
    const { id, ...data } = item;
    data.tenant_id = tenantId;
    data.created_at = data.created_at || now;
    data.updated_at = data.updated_at || now;
    data.updated_by = 'seed-script';
    if (typeof data.is_deleted === 'undefined') data.is_deleted = 0;

    // Compatibility aliases
    if (collectionName === 'customers') {
      if (!data.name && data.customer_name) data.name = data.customer_name;
    }
    if (collectionName === 'routes') {
      if (!data.name && data.route_name) data.name = data.route_name;
    }
    if (collectionName === 'trips') {
      if (typeof data.freight_revenue === 'undefined') data.freight_revenue = data.total_revenue || 0;
      if (typeof data.additional_charges === 'undefined') data.additional_charges = 0;
      if (typeof data.total_expenses === 'undefined') data.total_expenses = 0;
    }
    if (!data.record_id) data.record_id = `${tenantId}_${collectionName}_${id}`;

    const docRef = db.collection(collectionName).doc(id);
    batch.set(docRef, data);
    count++;

    // Firestore batch limit is 500 operations
    if (count % 400 === 0) {
      await batch.commit();
      console.log(`✅ ${collectionName}: committed ${count} documents`);
      return count; // For simplicity, commit and return early if large batch
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`✅ ${collectionName}: ${count} documents seeded`);
  }
  return count;
}

async function calculateTripExpenses() {
  const tripById = new Map(TRIPS.map(t => [t.id, t]));
  const expenseTotals = {};

  EXPENSES.forEach((e) => {
    if (e.trip_id && e.status === 'confirmed') {
      const amount = Number(e.amount || 0);
      expenseTotals[e.trip_id] = (expenseTotals[e.trip_id] || 0) + amount;
    }
  });

  TRIPS.forEach((t) => {
    if (typeof t.freight_revenue === 'undefined') t.freight_revenue = t.total_revenue || 0;
    if (typeof t.additional_charges === 'undefined') t.additional_charges = 0;
    if (typeof t.total_expenses === 'undefined') t.total_expenses = expenseTotals[t.id] || 0;
  });

  EXPENSES.forEach((e) => {
    const trip = tripById.get(e.trip_id);
    if (!trip) return;
    if (!e.driver_id) e.driver_id = trip.driver_id;
    if (!e.driver_name) e.driver_name = trip.driver_name;
    if (!e.vehicle_id) e.vehicle_id = trip.vehicle_id;
    if (!e.vehicle_plate) e.vehicle_plate = trip.vehicle_plate;
    if (!e.customer_id) e.customer_id = trip.customer_id;
    if (!e.route_id) e.route_id = trip.route_id;
  });
}

async function seedAllData() {
  const tenantId = process.env.TENANT_ID || 'internal-tenant-1';
  console.log(`🌱 Starting seed for tenant: ${tenantId}\n`);

  try {
    await calculateTripExpenses();

    const collections = [
      ['vehicles', VEHICLES],
      ['drivers', DRIVERS],
      ['customers', CUSTOMERS],
      ['routes', ROUTES],
      ['trips', TRIPS],
      ['expenses', EXPENSES],
      ['maintenance', MAINTENANCE],
      ['expenseCategories', EXPENSE_CATEGORIES],
      ['accountingPeriods', ACCOUNTING_PERIODS],
      ['companySettings', COMPANY_SETTINGS],
      ['transportOrders', TRANSPORT_ORDERS],
      ['tires', TIRES],
      ['inventory', INVENTORY],
      ['purchaseOrders', PURCHASE_ORDERS],
      ['inventoryTransactions', INVENTORY_TRANSACTIONS],
      ['tripExpenses', TRIP_EXPENSES],
      ['alerts', ALERTS],
      ['partners', PARTNERS],
      ['users', USERS]
    ];

    let totalSeeded = 0;
    for (const [name, data] of collections) {
      const count = await seedCollection(name, data, tenantId);
      totalSeeded += count;
    }

    console.log(`\n🎉 SEED COMPLETE! Total documents: ${totalSeeded}`);
    console.log('Scenario coverage: draft/pending/confirmed/dispatched/in_progress/completed/closed/cancelled + inventory + users roles + alerts');
    console.log('👉 Start FleetPro app to see data');

  } catch (error) {
    console.error('❌ SEED ERROR:', error);
    process.exit(1);
  } finally {
    admin.app().delete();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAllData();
}

export { seedAllData, seedCollection };