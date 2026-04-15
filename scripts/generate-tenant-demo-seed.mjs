#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// --- Utility Functions ---
const root = path.resolve(process.cwd());
const outFile = path.join(root, 'src', 'data', 'tenantDemoSeed.ts');
const outJson = path.join(root, 'scripts', 'tenantDemoSeed.json');

const addDays = (isoDate, days) => {
  const dt = new Date(`${isoDate}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateId = (prefix, i) => `${prefix}${String(i).padStart(4, '0')}`;

const TODAY = new Date().toISOString().slice(0, 10);
const DATE_START_DEMO = addDays(TODAY, -30);

// ============================================================
// CHUẨN VIỆT NAM — Dữ liệu thực tế ngành vận tải logistics
// ============================================================

// --- SĐT Việt Nam ---
const PHONE_PREFIXES = ['090', '091', '098', '097', '093', '035', '038', '032', '036', '039'];
const getRandomPhone = () => `${getRandomItem(PHONE_PREFIXES)}${getRandomInt(1000000, 9999999)}`;

// --- Địa chỉ chuẩn ---
const STREETS = [
  'Quốc lộ 1A', 'Xa lộ Hà Nội', 'Nguyễn Văn Linh', 'Phạm Văn Đồng', 'Võ Văn Kiệt',
  'Lê Văn Việt', 'Nguyễn Thị Minh Khai', 'Trường Chinh', 'Lý Thường Kiệt', 'Điện Biên Phủ',
  'Cách Mạng Tháng 8', 'Nguyễn Huệ', 'Lê Lợi', 'Phan Xích Long', 'Hai Bà Trưng',
];
const getRandomAddress = (city) => {
  const num = getRandomInt(1, 500);
  const street = getRandomItem(STREETS);
  return `${num} ${street}, ${city}`;
};

// --- 25 tên tài xế thật Việt Nam ---
const DRIVER_NAMES = [
  'Nguyễn Văn Hùng', 'Trần Minh Đức', 'Lê Thanh Tùng', 'Phạm Quốc Bảo', 'Võ Hoàng Nam',
  'Đặng Trường An', 'Bùi Xuân Hải', 'Hoàng Đình Phong', 'Ngô Anh Tuấn', 'Dương Văn Thắng',
  'Lý Minh Trí', 'Phan Ngọc Khánh', 'Huỳnh Tấn Phát', 'Mai Xuân Vinh', 'Đỗ Văn Lâm',
  'Trịnh Quang Huy', 'Vũ Đức Mạnh', 'Đinh Công Danh', 'Cao Minh Nhật', 'Tạ Quốc Trung',
  'Châu Thanh Long', 'Lương Đình Khoa', 'Hà Minh Quân', 'Nguyễn Hoàng Sơn', 'Trần Đại Nghĩa',
];

// --- Biển số xe đúng khu vực ---
const PLATE_MAP = [
  { prefixes: ['51', '59'], location: 'Bãi xe Quận 12, TP.HCM' },      // TP.HCM
  { prefixes: ['61'],       location: 'Bãi xe KCN Sóng Thần, Bình Dương' }, // Bình Dương
  { prefixes: ['60'],       location: 'KCN Biên Hòa, Đồng Nai' },       // Đồng Nai
  { prefixes: ['62'],       location: 'Bãi xe Tân An, Long An' },        // Long An
];
const generatePlate = (regionIdx) => {
  const region = PLATE_MAP[regionIdx % PLATE_MAP.length];
  const prefix = getRandomItem(region.prefixes);
  return {
    plate: `${prefix}C-${getRandomInt(100, 999)}.${String(getRandomInt(10, 99)).padStart(2, '0')}`,
    location: region.location,
  };
};

// --- Khách hàng thực tế ngành vận tải miền Nam ---
const CUSTOMER_DATA = [
  { name: 'CÔNG TY CP THÉP HÒA PHÁT DUNG QUẤT', short: 'Hòa Phát', tax: '0317890123', contact: 'Ông Trần Văn Minh', city: 'KCN Sóng Thần, Bình Dương' },
  { name: 'CTY TNHH NƯỚC GIẢI KHÁT SUNTORY PEPSICO VN', short: 'PepsiCo', tax: '0302567890', contact: 'Bà Nguyễn Thị Lan', city: 'KCN Tân Bình, TP.HCM' },
  { name: 'CÔNG TY CP SỮA VIỆT NAM (VINAMILK)', short: 'Vinamilk', tax: '0300588057', contact: 'Ông Lê Quang Hiếu', city: 'Quận 7, TP.HCM' },
  { name: 'CTY TNHH SAMSUNG ELECTRONICS VN - TPHCM', short: 'Samsung', tax: '0309876543', contact: 'Bà Phạm Thu Hà', city: 'KCN Biên Hòa, Đồng Nai' },
  { name: 'CẢNG CONTAINER QUỐC TẾ CÁT LÁI (TCIT)', short: 'Cát Lái', tax: '0301234567', contact: 'Ông Võ Đình Phúc', city: 'Quận 2, TP.HCM' },
  { name: 'CÔNG TY CP PHÂN BÓN BÌNH ĐIỀN', short: 'Bình Điền', tax: '0303456789', contact: 'Bà Trần Thị Mai', city: 'Quận Gò Vấp, TP.HCM' },
  { name: 'CTY TNHH NESTLÉ VIỆT NAM', short: 'Nestlé', tax: '0304567890', contact: 'Ông Đặng Minh Tuấn', city: 'KCN VSIP, Bình Dương' },
  { name: 'TỔNG CTY BIA RƯỢU NGK SÀI GÒN (SABECO)', short: 'Sabeco', tax: '0300898706', contact: 'Ông Huỳnh Quốc Việt', city: 'Quận 12, TP.HCM' },
  { name: 'CTY CP HÀNG TIÊU DÙNG MASAN', short: 'Masan', tax: '0305678901', contact: 'Bà Lê Thị Hồng', city: 'KCN Long Thành, Đồng Nai' },
  { name: 'CTY TNHH THƯƠNG MẠI GỖ ĐỨC THÀNH', short: 'Đức Thành', tax: '0306789012', contact: 'Ông Nguyễn Đức Thành', city: 'Quận Bình Tân, TP.HCM' },
];

// --- Loại xe thật ---
const VEHICLE_MODELS = [
  { capacity: 1.5, type: 'Xe tải nhẹ',  brand: 'Kia K200',      fuelRate: 10, baseOdo: 80000 },
  { capacity: 2.5, type: 'Xe tải nhẹ',  brand: 'Hyundai Porter', fuelRate: 12, baseOdo: 90000 },
  { capacity: 3.5, type: 'Xe tải trung', brand: 'Isuzu NQR',     fuelRate: 14, baseOdo: 120000 },
  { capacity: 5,   type: 'Xe tải trung', brand: 'Hino 300',      fuelRate: 18, baseOdo: 140000 },
  { capacity: 8,   type: 'Xe tải nặng',  brand: 'Hino 500',      fuelRate: 22, baseOdo: 180000 },
  { capacity: 15,  type: 'Xe đầu kéo',   brand: 'Hyundai HD1000', fuelRate: 35, baseOdo: 250000 },
  { capacity: 20,  type: 'Xe container',  brand: 'Daewoo Prima',  fuelRate: 42, baseOdo: 300000 },
];

// --- Tuyến đường vận tải thực tế miền Nam ---
const ROUTES_DEF = [
  { origin: 'Cảng Cát Lái, TP.HCM',          dest: 'KCN Sóng Thần, Bình Dương',    dist: 35,  basePerTon: 80000,  tolls: 25000 },
  { origin: 'KCN Tân Tạo, TP.HCM',           dest: 'KCN Mỹ Phước 3, Bình Dương',   dist: 55,  basePerTon: 110000, tolls: 40000 },
  { origin: 'Quận 7, TP.HCM',                 dest: 'KCN Biên Hòa, Đồng Nai',       dist: 40,  basePerTon: 90000,  tolls: 20000 },
  { origin: 'Cảng Cát Lái, TP.HCM',           dest: 'KCN Trảng Bàng, Tây Ninh',     dist: 120, basePerTon: 220000, tolls: 70000 },
  { origin: 'TP.HCM',                          dest: 'Cảng Cái Mép, Bà Rịa-Vũng Tàu', dist: 110, basePerTon: 200000, tolls: 105000 },
  { origin: 'KCN VSIP, Bình Dương',           dest: 'Cảng Cái Mép, Bà Rịa-Vũng Tàu', dist: 80,  basePerTon: 160000, tolls: 50000 },
  { origin: 'TP.HCM',                          dest: 'KCN Trà Nóc, Cần Thơ',          dist: 170, basePerTon: 350000, tolls: 150000 },
  { origin: 'Cảng Mỹ Tho, Tiền Giang',        dest: 'ICD Phước Long, TP.HCM',        dist: 130, basePerTon: 280000, tolls: 110000 },
  { origin: 'KCN Long Thành, Đồng Nai',       dest: 'Phan Thiết, Bình Thuận',         dist: 200, basePerTon: 450000, tolls: 120000 },
  { origin: 'ICD Phước Long, TP.HCM',         dest: 'Cam Ranh, Khánh Hòa',            dist: 450, basePerTon: 950000, tolls: 350000 },
  { origin: 'Cảng Quy Nhơn, Bình Định',       dest: 'Cảng Tiên Sa, Đà Nẵng',          dist: 320, basePerTon: 750000, tolls: 250000 },
  { origin: 'KCN Tân An, Long An',             dest: 'ICD Phước Long, TP.HCM',         dist: 50,  basePerTon: 95000,  tolls: 15000 },
];

// --- Danh mục chi phí chuẩn vận tải ---
const expenseCategories = [
  { id: 'CAT001', category_code: 'CAT001', category_name: 'Nhiên liệu (Dầu Diesel)', category_type: 'variable', is_trip_related: 1, is_vehicle_related: 1, notes: 'Đổ dầu Diesel tại trạm xăng' },
  { id: 'CAT002', category_code: 'CAT002', category_name: 'Phí cầu đường (BOT)', category_type: 'variable', is_trip_related: 1, is_vehicle_related: 0, notes: 'Vé qua trạm BOT, phí cao tốc' },
  { id: 'CAT003', category_code: 'CAT003', category_name: 'Khoán chuyến tài xế', category_type: 'variable', is_trip_related: 1, is_vehicle_related: 0, notes: 'Lương đi chuyến, bồi dưỡng bốc xếp' },
  { id: 'CAT004', category_code: 'CAT004', category_name: 'Bảo dưỡng - Sửa chữa', category_type: 'variable', is_trip_related: 0, is_vehicle_related: 1, notes: 'Thay nhớt, bảo trì, sửa chữa, phụ tùng' },
  { id: 'CAT005', category_code: 'CAT005', category_name: 'Chi phí cố định (Bãi, BH)', category_type: 'fixed', is_trip_related: 0, is_vehicle_related: 1, notes: 'Thuê bãi, bảo hiểm, đăng kiểm, phí đường bộ' },
  { id: 'CAT006', category_code: 'CAT006', category_name: 'Chi phí văn phòng', category_type: 'fixed', is_trip_related: 0, is_vehicle_related: 0, notes: 'Điện, nước, mạng, thuê văn phòng' },
];

// --- Company Settings ---
const companySettings = [{
  id: 'default',
  company_name: 'CÔNG TY VẬN TẢI LOGISTICS PHÚ AN',
  tax_code: '0317567890',
  address: '123 Lương Định Của, P. An Phú, TP. Thủ Đức, TP.HCM',
  phone: '028-3824-1234',
  email: 'contact@fleetpro.vn',
  website: 'https://fleetpro.vn',
  logo_url: '',
  currency: 'VND',
  date_format: 'DD/MM/YYYY',
  primary_color: '#2563eb',
}];

// --- User Accounts (match tenant registry) ---
const users = [
  { id: 'admin_demo', email: 'admindemo@tnc.io.vn', full_name: 'Admin Demo', role: 'admin', status: 'active' },
  { id: 'quanly_demo', email: 'quanlydemo@tnc.io.vn', full_name: 'Quản Lý Demo', role: 'manager', status: 'active' },
  { id: 'ketoan_demo', email: 'ketoandemo@tnc.io.vn', full_name: 'Kế Toán Demo', role: 'accountant', status: 'active' },
  { id: 'taixe_demo', email: 'taixedemo@tnc.io.vn', full_name: 'Tài Xế Demo', role: 'driver', status: 'active' },
];

console.log("🚀 Bắt đầu tạo dữ liệu Demo chuẩn Việt Nam...");

// ============================================================
// 1. CUSTOMERS
// ============================================================
const customers = CUSTOMER_DATA.map((c, i) => {
  const code = generateId('KH', i + 1);
  return {
    id: code,
    customer_code: code,
    customer_name: c.name,
    name: c.name,
    customer_type: 'business',
    tax_code: c.tax,
    contact_person: c.contact,
    phone: getRandomPhone(),
    email: `lienhe@${c.short.toLowerCase().replace(/\s/g, '')}.vn`,
    address: getRandomAddress(c.city),
    credit_limit: getRandomItem([100_000_000, 200_000_000, 500_000_000]),
    current_debt: 0,
    payment_terms: 30,
    status: 'active',
  };
});

// ============================================================
// 2. VEHICLES (20 xe, biển số đúng khu vực)
// ============================================================
const vehicles = [];
for (let i = 1; i <= 20; i++) {
  const code = generateId('XE', i);
  const model = VEHICLE_MODELS[i % VEHICLE_MODELS.length];
  const { plate, location } = generatePlate(i % PLATE_MAP.length);
  const assignmentType = i <= 16 ? 'fixed' : 'pool';

  vehicles.push({
    id: code,
    vehicle_code: code,
    license_plate: plate,
    vehicle_type: model.type,
    brand: model.brand,
    capacity_tons: model.capacity,
    fuel_type: 'Diesel',
    usage_limit_years: `${new Date().getFullYear() + 20}`,
    engine_number: `ENG-${code}-${getRandomInt(1000, 9999)}`,
    chassis_number: `CHS-${code}-${getRandomInt(1000, 9999)}`,
    insurance_purchase_date: addDays(TODAY, -getRandomInt(30, 300)),
    insurance_expiry_date: addDays(TODAY, getRandomInt(60, 300)),
    registration_date: addDays(TODAY, -getRandomInt(30, 150)),
    registration_expiry_date: addDays(TODAY, getRandomInt(30, 150)),
    insurance_cost: model.capacity > 8 ? 15_000_000 : 4_500_000,
    registration_cost: 350_000,
    current_location: location,
    current_odometer: model.baseOdo + getRandomInt(1000, 10000),
    assignment_type: assignmentType,
    status: 'active',
    _fuelRate: model.fuelRate, // temp, deleted before export
  });
}

// ============================================================
// 3. DRIVERS (25 tài xế, tên thật VN, chỉ 1 field ngày sinh)
// ============================================================
const drivers = [];
let fDriverIndex = 0;
for (let i = 1; i <= 25; i++) {
  const code = generateId('TX', i);
  const isFixed = i <= 16;
  const assignedVehicle = isFixed ? vehicles[fDriverIndex]?.id : undefined;
  const cities = ['TP.HCM', 'Bình Dương', 'Đồng Nai', 'Long An'];

  drivers.push({
    id: code,
    driver_code: code,
    full_name: DRIVER_NAMES[i - 1],
    email: i === 1 ? 'taixedemo@tnc.io.vn' : `driver${i}@fleetpro.vn`,
    phone: getRandomPhone(),
    id_card: `0${getRandomInt(79, 86)}${getRandomInt(10000000, 99999999)}`,
    date_of_birth: addDays(TODAY, -getRandomInt(9000, 15000)), // 25-41 years old
    address: getRandomAddress(getRandomItem(cities)),
    hire_date: addDays(TODAY, -getRandomInt(100, 1200)),
    license_number: `1100${getRandomInt(10000000, 99999999)}`,
    license_class: getRandomItem(['C', 'FC', 'E']),
    license_expiry: addDays(TODAY, getRandomInt(100, 1500)),
    health_check_expiry: addDays(TODAY, getRandomInt(30, 300)),
    assigned_vehicle_id: assignedVehicle,
    base_salary: getRandomItem([5_000_000, 5_500_000, 6_000_000, 7_000_000]),
    status: 'active',
  });

  if (isFixed && fDriverIndex < vehicles.length) {
    vehicles[fDriverIndex].assigned_driver_id = code;
    vehicles[fDriverIndex].default_driver_id = code;
    fDriverIndex++;
  }
}

// ============================================================
// 4. ROUTES
// ============================================================
const routes = ROUTES_DEF.map((rd, i) => {
  const code = generateId('TD', i + 1);
  return {
    id: code,
    route_code: code,
    route_name: `${rd.origin} → ${rd.dest}`,
    name: `${rd.origin} → ${rd.dest}`,
    origin: rd.origin,
    destination: rd.dest,
    distance_km: rd.dist,
    estimated_duration_hours: Math.round((rd.dist / 40) * 10) / 10,
    base_price: rd.basePerTon,
    standard_freight_rate: rd.basePerTon,
    toll_cost: rd.tolls,
    status: 'active',
  };
});

// ============================================================
// 5. TRIPS + EXPENSES (Procedural Simulation — 30 days)
// ============================================================
const trips = [];
const expenses = [];
const maintenance = [];
const FUEL_PRICE_LITER = 21500;
let tripIndex = 1;
let expenseIndex = 1;

const CARGO_TYPES = [
  'Hàng tiêu dùng', 'Sắt thép xây dựng', 'Nước giải khát', 'Sữa tươi đóng thùng',
  'Linh kiện điện tử', 'Phân bón', 'Gỗ ván ép', 'Bia thùng', 'Thực phẩm đông lạnh',
  'Container 20ft', 'Container 40ft', 'Hàng bách hóa', 'Xi măng bao',
];

for (let dayOffset = 0; dayOffset <= 30; dayOffset++) {
  const currentSimDate = addDays(DATE_START_DEMO, dayOffset);
  const isWeekend = new Date(`${currentSimDate}T00:00:00Z`).getUTCDay() % 6 === 0;
  const tripsToday = isWeekend ? getRandomInt(6, 10) : getRandomInt(12, 18);

  for (let t = 0; t < tripsToday; t++) {
    const v = getRandomItem(vehicles);
    let d = v.assignment_type === 'fixed'
      ? drivers.find(drv => drv.assigned_vehicle_id === v.id)
      : getRandomItem(drivers.filter(drv => !drv.assigned_vehicle_id));
    if (!d) d = drivers[0];

    const c = getRandomItem(customers);
    const r = getRandomItem(routes);

    const distance = r.distance_km + getRandomInt(-10, 20);
    const cargoTons = Number((v.capacity_tons * (getRandomInt(70, 100) / 100)).toFixed(1));
    const freightRevenue = Math.round(cargoTons * r.base_price / 1000) * 1000;
    const additionalCharges = getRandomInt(0, 2) === 0 ? getRandomInt(2, 5) * 100_000 : 0;
    const totalRevenue = freightRevenue + additionalCharges;

    const fuelLiters = Math.round((distance / 100) * v._fuelRate);
    const fuelCost = fuelLiters * FUEL_PRICE_LITER;
    const tollCost = r.toll_cost;
    const driverWage = Math.round(freightRevenue * 0.08);

    const startOdo = v.current_odometer;
    const endOdo = startOdo + distance;
    v.current_odometer = endOdo;

    const tripStatus = dayOffset === 30
      ? getRandomItem(['confirmed', 'in_progress', 'dispatched'])
      : 'completed';

    const tripId = `CD${String(tripIndex).padStart(5, '0')}`;
    trips.push({
      id: tripId,
      trip_code: tripId,
      vehicle_id: v.id,
      driver_id: d.id,
      customer_id: c.id,
      route_id: r.id,
      departure_date: currentSimDate,
      arrival_date: tripStatus === 'completed' ? currentSimDate : null,
      cargo_weight_tons: cargoTons,
      cargo_type: getRandomItem(CARGO_TYPES),
      actual_distance_km: distance,
      start_odometer: startOdo,
      end_odometer: endOdo,
      freight_revenue: freightRevenue,
      additional_charges: additionalCharges,
      total_revenue: totalRevenue,
      fuel_liters: fuelLiters,
      fuel_cost: fuelCost,
      status: tripStatus,
      notes: `${getRandomItem(CARGO_TYPES)} - ${r.distance_km}km`,
      pod_status: tripStatus === 'completed' ? 'RECEIVED' : 'PENDING',
    });
    tripIndex++;

    if (tripStatus === 'completed') c.current_debt += totalRevenue;

    // --- EXPENSE: Nhiên liệu ---
    expenses.push({
      id: `PC${String(expenseIndex).padStart(5, '0')}`,
      expense_code: `PC${String(expenseIndex).padStart(5, '0')}`,
      expense_date: currentSimDate,
      category_id: 'CAT001',
      trip_id: tripId,
      vehicle_id: v.id,
      description: `Đổ ${fuelLiters} lít Diesel - ${tripId}`,
      amount: fuelCost,
      status: 'confirmed'
    }); expenseIndex++;

    // --- EXPENSE: Cầu đường ---
    if (tollCost > 0) {
      expenses.push({
        id: `PC${String(expenseIndex).padStart(5, '0')}`,
        expense_code: `PC${String(expenseIndex).padStart(5, '0')}`,
        expense_date: currentSimDate,
        category_id: 'CAT002',
        trip_id: tripId,
        vehicle_id: v.id,
        description: `Phí BOT cao tốc - ${tripId}`,
        amount: tollCost,
        status: 'confirmed'
      }); expenseIndex++;
    }

    // --- EXPENSE: Khoán chuyến ---
    expenses.push({
      id: `PC${String(expenseIndex).padStart(5, '0')}`,
      expense_code: `PC${String(expenseIndex).padStart(5, '0')}`,
      expense_date: currentSimDate,
      category_id: 'CAT003',
      trip_id: tripId,
      vehicle_id: v.id,
      description: `Khoán chuyến tài xế ${d.full_name} - ${tripId}`,
      amount: driverWage,
      status: 'confirmed'
    }); expenseIndex++;

    // --- MAINTENANCE: mỗi 10,000km ---
    if (v.current_odometer % 10000 < distance) {
      maintenance.push({
        id: `BD${String(maintenance.length + 1).padStart(4, '0')}`,
        vehicle_id: v.id,
        maintenance_type: 'Bảo dưỡng định kỳ',
        description: `Thay nhớt máy, lọc dầu, kiểm tra phanh - ${v.license_plate}`,
        cost: getRandomItem([2_500_000, 3_000_000, 3_500_000]),
        currency: 'VND',
        maintenance_date: currentSimDate,
        odometer: v.current_odometer,
        next_maintenance_odometer: v.current_odometer + 10000,
        notes: 'Bảo dưỡng theo định mức 10.000km',
        status: 'completed'
      });

      expenses.push({
        id: `PC${String(expenseIndex).padStart(5, '0')}`,
        expense_code: `PC${String(expenseIndex).padStart(5, '0')}`,
        expense_date: currentSimDate,
        category_id: 'CAT004',
        trip_id: null,
        vehicle_id: v.id,
        description: `Bảo dưỡng định kỳ 10.000km - ${v.license_plate}`,
        amount: 2_500_000,
        status: 'confirmed'
      }); expenseIndex++;
    }
  }
}

// --- EXPENSE: Chi phí cố định đầu tháng ---
vehicles.forEach(v => {
  expenses.push({
    id: `PC${String(expenseIndex).padStart(5, '0')}`,
    expense_code: `PC${String(expenseIndex).padStart(5, '0')}`,
    expense_date: addDays(TODAY, -20),
    category_id: 'CAT005',
    trip_id: null,
    vehicle_id: v.id,
    description: `Phí bãi + phân bổ BH xe - ${v.license_plate}`,
    amount: Math.round(v.insurance_cost / 12) + 1_200_000,
    status: 'confirmed'
  }); expenseIndex++;
});

// ============================================================
// 6. MAINTENANCE bổ sung (scheduled + overdue)
// ============================================================
const extraMaintenance = [
  { id: `BD${String(maintenance.length + 1).padStart(4, '0')}`, vehicle_id: 'XE0005', maintenance_type: 'Thay lốp', description: 'Thay 4 lốp sau xe container', cost: 12_000_000, currency: 'VND', maintenance_date: addDays(TODAY, 7), status: 'scheduled', notes: 'Lốp Bridgestone 11R22.5' },
  { id: `BD${String(maintenance.length + 2).padStart(4, '0')}`, vehicle_id: 'XE0008', maintenance_type: 'Kiểm tra phanh', description: 'Rà phanh, thay má phanh trước', cost: 4_000_000, currency: 'VND', maintenance_date: addDays(TODAY, -3), status: 'overdue', notes: 'Quá hạn 3 ngày — cần xử lý gấp' },
  { id: `BD${String(maintenance.length + 3).padStart(4, '0')}`, vehicle_id: 'XE0012', maintenance_type: 'Bảo dưỡng định kỳ', description: 'Thay nhớt + lọc dầu + kiểm tra tổng quát', cost: 3_500_000, currency: 'VND', maintenance_date: addDays(TODAY, 3), status: 'scheduled', notes: 'Bảo dưỡng chuẩn 15.000km' },
  { id: `BD${String(maintenance.length + 4).padStart(4, '0')}`, vehicle_id: 'XE0003', maintenance_type: 'Sửa chữa đột xuất', description: 'Thay bơm nước, sửa két nước xe', cost: 5_500_000, currency: 'VND', maintenance_date: addDays(TODAY, -1), status: 'in_progress', notes: 'Xe bị nóng máy trên đường' },
];
maintenance.push(...extraMaintenance);

// ============================================================
// 7. TRANSPORT ORDERS (đơn hàng vận chuyển)
// ============================================================
const transportOrders = [];
for (let i = 1; i <= 6; i++) {
  const c = customers[i % customers.length];
  const r = routes[i % routes.length];
  const statuses = ['draft', 'confirmed', 'in_transit', 'delivered', 'completed', 'completed'];
  transportOrders.push({
    id: generateId('DH', i),
    order_code: generateId('DH', i),
    customer_id: c.id,
    customer_name: c.name,
    route_id: r.id,
    origin: r.origin,
    destination: r.destination,
    cargo_type: getRandomItem(CARGO_TYPES),
    weight_tons: getRandomItem([3, 5, 8, 15, 20]),
    order_date: addDays(TODAY, -getRandomInt(1, 25)),
    delivery_date: i >= 4 ? addDays(TODAY, -getRandomInt(1, 10)) : null,
    estimated_cost: getRandomInt(5, 20) * 1_000_000,
    status: statuses[i - 1],
    notes: `Đơn hàng ${c.customer_name}`,
  });
}

// ============================================================
// 8. ALERTS (cảnh báo sắp hết hạn)
// ============================================================
// Force expiry dates for realistic alerts
vehicles[2].insurance_expiry_date = addDays(TODAY, 5);   // BH sắp hết
vehicles[6].registration_expiry_date = addDays(TODAY, 3); // ĐK sắp hết
vehicles[3].status = 'maintenance';                       // Xe đang sửa
drivers[4].license_expiry = addDays(TODAY, 10);           // GPLX sắp hết
drivers[9].health_check_expiry = addDays(TODAY, -2);      // Sức khỏe quá hạn

const alerts = [
  { id: 'ALR001', alert_type: 'insurance_expiry', severity: 'high', title: `BH xe ${vehicles[2].license_plate} sắp hết hạn`, description: `Bảo hiểm hết hạn ngày ${vehicles[2].insurance_expiry_date}. Cần gia hạn trước khi xe xuất bến.`, vehicle_id: 'XE0003', is_read: false, created_at: addDays(TODAY, -1), status: 'active' },
  { id: 'ALR002', alert_type: 'registration_expiry', severity: 'high', title: `Đăng kiểm xe ${vehicles[6].license_plate} sắp hết hạn`, description: `Đăng kiểm hết hạn ngày ${vehicles[6].registration_expiry_date}. Đặt lịch đăng kiểm ngay.`, vehicle_id: 'XE0007', is_read: false, created_at: addDays(TODAY, -1), status: 'active' },
  { id: 'ALR003', alert_type: 'license_expiry', severity: 'medium', title: `GPLX tài xế ${drivers[4].full_name} sắp hết hạn`, description: `Giấy phép lái xe hết hạn ngày ${drivers[4].license_expiry}. Cần gia hạn GPLX.`, driver_id: 'TX0005', is_read: false, created_at: TODAY, status: 'active' },
  { id: 'ALR004', alert_type: 'health_check_overdue', severity: 'critical', title: `Sức khỏe tài xế ${drivers[9].full_name} ĐÃ QUÁ HẠN`, description: `Giấy khám sức khỏe đã quá hạn. Tạm dừng điều phối cho tài xế này.`, driver_id: 'TX0010', is_read: false, created_at: TODAY, status: 'active' },
  { id: 'ALR005', alert_type: 'maintenance_overdue', severity: 'high', title: `Bảo dưỡng xe ${vehicles[7].license_plate} quá hạn`, description: `Xe đã vượt mốc 10.000km cần bảo dưỡng. Liên hệ garage sớm nhất.`, vehicle_id: 'XE0008', is_read: true, created_at: addDays(TODAY, -3), status: 'resolved' },
  { id: 'ALR006', alert_type: 'overloaded', severity: 'medium', title: 'Phát hiện xe chở quá tải', description: `Chuyến ${trips[trips.length - 5]?.id} ghi nhận tải trọng vượt 10% so với tải trọng xe.`, is_read: false, created_at: addDays(TODAY, -2), status: 'active' },
];

// ============================================================
// 9. Ensure Driver 1 has active trips
// ============================================================
const driver1Id = drivers[0].id;
const activeTripsForD1 = trips.filter(t => t.driver_id === driver1Id && ['in_progress', 'dispatched'].includes(t.status));
if (activeTripsForD1.length === 0) {
  const lastD1Trip = trips.filter(t => t.driver_id === driver1Id).pop();
  if (lastD1Trip) {
    lastD1Trip.status = 'dispatched';
    lastD1Trip.departure_date = TODAY;
  }
}

// ============================================================
// CLEANUP & EXPORT
// ============================================================
vehicles.forEach(v => { delete v._fuelRate; });

const payload = {
  metadata: {
    generated_at: new Date().toISOString(),
    source: 'PROCEDURAL_REALISTIC_VN_V3',
    counts: {
      vehicles: vehicles.length,
      drivers: drivers.length,
      customers: customers.length,
      routes: routes.length,
      trips: trips.length,
      expenses: expenses.length,
      expenseCategories: expenseCategories.length,
      maintenance: maintenance.length,
      transportOrders: transportOrders.length,
      alerts: alerts.length,
      accountingPeriods: 1,
      users: users.length,
      companySettings: companySettings.length,
    },
  },
  collections: {
    vehicles,
    drivers,
    customers,
    routes,
    trips,
    expenses,
    expenseCategories,
    maintenance,
    transportOrders,
    alerts,
    accountingPeriods: [{
      id: 'AP2026-04',
      name: `Kỳ kế toán Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      start_date: DATE_START_DEMO,
      end_date: TODAY,
      status: 'open',
      total_revenue: 0,
      total_expense: 0,
    }],
    users,
    companySettings,
  },
};

const fileContent = `/* eslint-disable */\n// Auto-generated by Procedural Simulator V3 — Chuẩn Việt Nam\n// Generated: ${new Date().toISOString()}\n// Do not edit manually.\n\nexport const TENANT_DEMO_SEED = ${JSON.stringify(payload, null, 2)} as const;\n`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, fileContent, 'utf8');
fs.writeFileSync(outJson, JSON.stringify(payload, null, 2), 'utf8');

console.log(`✅ Hoàn tất! Database Demo V3 chuẩn Việt Nam:`);
console.log(`   📁 TypeScript: ${path.relative(root, outFile)}`);
console.log(`   📁 JSON:       ${path.relative(root, outJson)}`);
console.log(payload.metadata);
