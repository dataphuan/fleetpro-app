#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const root = path.resolve(process.cwd());
const demoDir = path.join(root, 'DATA-DEMO');
const outFile = path.join(root, 'src', 'data', 'tenantDemoSeed.ts');

const files = {
  vehicles: 'Danh_sach_xe_2026-03-31.xlsx',
  drivers: 'Danh_sach_tai_xe_2026-03-31.xlsx',
  customers: 'Danh_sach_khach_hang_2026-03-31.xlsx',
  routes: 'Danh_sach_tuyen_van_chuyen_2026-03-31.xlsx',
  trips: 'Danh_sach_chuyen_2026-03-31.xlsx',
  expenses: 'Danh_sach_chi_phi_2026-03-31.xlsx',
};

const readRows = (filename) => {
  const wb = XLSX.readFile(path.join(demoDir, filename));
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
};

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(String(v).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

const toText = (v) => (v === null || v === undefined ? '' : String(v).trim());

const toIsoDate = (v) => {
  if (!v) return undefined;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return undefined;
    return `${String(d.y).padStart(4, '0')}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return s;
};

const getFirst = (row, keys) => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== null && row[key] !== undefined && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return undefined;
};

const getText = (row, keys) => toText(getFirst(row, keys));
const getNum = (row, keys) => toNum(getFirst(row, keys));
const getDate = (row, keys) => toIsoDate(getFirst(row, keys));

const addDays = (isoDate, days) => {
  if (!isoDate) return undefined;
  const dt = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return undefined;
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
};

const getRandomPhone = () => {
    const prefixes = ['090', '091', '098', '097', '093', '035', '038'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(1000000 + Math.random() * 9000000).toString();
    return `${prefix}${suffix}`;
};

const getRandomAddress = (cityHint = 'TP.HCM') => {
    const streets = ['Lê Lợi', 'Nguyễn Huệ', 'Trần Hưng Đạo', 'Cách Mạng Tháng 8', 'Lý Tự Trọng', 'Hai Bà Trưng', 'Phan Xích Long'];
    const wards = ['Phường 1', 'Phường Bến Thành', 'Phường Đa Kao', 'Phường 15', 'Phường 5'];
    const districts = ['Quận 1', 'Quận 3', 'Quận Phú Nhuận', 'Quận Tân Bình', 'Quận Bình Thạnh'];
    
    const street = streets[Math.floor(Math.random() * streets.length)];
    const num = Math.floor(1 + Math.random() * 500);
    const ward = wards[Math.floor(Math.random() * wards.length)];
    const dist = districts[Math.floor(Math.random() * districts.length)];
    
    return `${num} ${street}, ${ward}, ${dist}, ${cityHint}`;
};

const classifyExpenseTypeByKeyword = (text) => {
  const s = toText(text).toLowerCase();
  if (s.includes('dầu') || s.includes('nhiên liệu') || s.includes('xăng')) return 'Nhiên liệu';
  if (s.includes('cầu đường') || s.includes('cao tốc') || s.includes('phí đường')) return 'Cầu đường';
  if (s.includes('bốc xếp') || s.includes('nhân công')) return 'Nhân công';
  if (s.includes('bảo dưỡng') || s.includes('sửa chữa') || s.includes('lốp')) return 'Bảo dưỡng';
  return 'Khác';
};

const statusMap = (v, map, fallback = 'active') => {
  const key = toText(v).toLowerCase();
  return map[key] || fallback;
};

const rawVehicles = readRows(files.vehicles);
const rawDrivers = readRows(files.drivers);
const rawCustomers = readRows(files.customers);
const rawRoutes = readRows(files.routes);
const rawTrips = readRows(files.trips);
const rawExpenses = readRows(files.expenses);

const vehicles = rawVehicles
  .map((r, idx) => {
    const code = toText(r['Mã xe']);
    if (!code) return null;
    const registrationExpiry = Object.keys(r).find((k) => String(k).includes('hết hạn') && String(k).includes('đăng kiểm'));
    const insurancePurchaseDate = getDate(r, ['Ngày mua bảo hiểm', 'Ngày mua BH', 'Mua bảo hiểm']);
    const insuranceExpiry = getDate(r, ['Ngày hết hạn bảo hiểm', 'Hạn bảo hiểm']);
    const insuranceCivilExpiry = getDate(r, ['Hạn BH Dân sự', 'Ngày hết hạn BH TNDS']) || insuranceExpiry;
    const insuranceBodyExpiry = getDate(r, ['Hạn BH Thân vỏ', 'Ngày hết hạn BH vật chất']) || insuranceExpiry;
    const registrationDate = getDate(r, ['Ngày đăng kiểm', 'Ngày kiểm định']);
    const registrationExpiryDate = registrationExpiry ? toIsoDate(r[registrationExpiry]) : getDate(r, ['Ngày hết hạn đăng kiểm', 'Hạn đăng kiểm']);

    return {
      id: code,
      vehicle_code: code,
      license_plate: toText(r['Biển số']),
      vehicle_type: toText(r['Loại xe']),
      brand: toText(r['Nhãn hiệu xe']) || undefined,
      capacity_tons: toNum(r['Tải trọng']),
      fuel_type: toText(r['Nhiên liệu']) || 'Diesel',
      usage_limit_years: toText(r['Niên hạn sử dụng']) || undefined,
      engine_number: toText(r['Số máy']) || undefined,
      chassis_number: toText(r['Số Khung']) || undefined,
      insurance_purchase_date: insurancePurchaseDate,
      insurance_expiry_date: insuranceExpiry,
      insurance_expiry_civil: insuranceCivilExpiry,
      insurance_expiry_body: insuranceBodyExpiry,
      insurance_civil_expiry: insuranceCivilExpiry,
      insurance_body_expiry: insuranceBodyExpiry,
      insurance_cost: toNum(r['Số tiền mua bảo hiểm']),
      registration_cycle: toText(r['Chu kỳ đăng kiểm']) || undefined,
      inspection_cycle: toText(r['Chu kỳ đăng kiểm']) || undefined,
      registration_date: registrationDate,
      inspection_date: registrationDate,
      registration_expiry_date: registrationExpiryDate,
      inspection_expiry_date: registrationExpiryDate,
      registration_cost: toNum(r['Số tiền đăng kiểm']),
      current_location: toText(r['Vị trí xe']) || undefined,
      current_odometer: 0,
      status: statusMap(r['Trạng thái xe'], {
        'đang hoạt động': 'active',
        'hoạt động': 'active',
        active: 'active',
        'bảo dưỡng': 'maintenance',
        maintenance: 'maintenance',
        inactive: 'inactive',
        'ngưng hoạt động': 'inactive',
      }),
      notes: toText(r['Ghi chú']) || undefined,
    };
  })
  .filter(Boolean);

vehicles.forEach((v, idx) => {
  const fallbackInsurancePurchase = addDays('2025-06-01', idx * 5); // Shifted forward
  const fallbackInsuranceExpiry = addDays(fallbackInsurancePurchase, 365);
  const fallbackRegistrationDate = addDays('2026-01-15', idx * 7);
  const fallbackRegistrationExpiry = addDays(fallbackRegistrationDate, 180);

  v.engine_number = v.engine_number || `ENG-${v.vehicle_code}`;
  v.chassis_number = v.chassis_number || `CHS-${v.vehicle_code}`;
  v.insurance_purchase_date = v.insurance_purchase_date || fallbackInsurancePurchase;
  v.insurance_expiry_date = v.insurance_expiry_date || fallbackInsuranceExpiry;
  v.insurance_expiry_civil = v.insurance_expiry_civil || v.insurance_expiry_date;
  v.insurance_expiry_body = v.insurance_expiry_body || v.insurance_expiry_date;
  v.insurance_civil_expiry = v.insurance_civil_expiry || v.insurance_expiry_civil;
  v.insurance_body_expiry = v.insurance_body_expiry || v.insurance_expiry_body;
  v.registration_cycle = v.registration_cycle || '6 tháng';
  v.inspection_cycle = v.inspection_cycle || v.registration_cycle;
  v.registration_date = v.registration_date || fallbackRegistrationDate;
  v.inspection_date = v.inspection_date || v.registration_date;
  v.registration_expiry_date = v.registration_expiry_date || fallbackRegistrationExpiry;
  v.inspection_expiry_date = v.inspection_expiry_date || v.registration_expiry_date;
  v.registration_cost = typeof v.registration_cost === 'number' ? v.registration_cost : 350000;
  
  const hubs = ['Bãi xe Quận 12, TP.HCM', 'Bãi xe Sóng Thần, Bình Dương', 'Bãi xe Warehouse, Đồng Nai', 'VP Đại diện TP.HCM'];
  v.current_location = v.current_location || hubs[idx % hubs.length];
});

const drivers = rawDrivers
  .map((r) => {
    const code = toText(r['Mã TX']);
    if (!code) return null;
    const dateOfBirth = getDate(r, ['Ngày sinh', 'DOB']);
    const hireDate = getDate(r, ['Ngày vào làm', 'Ngày nhận việc']);
    const idIssueDate = getDate(r, ['Cấp ngày', 'Ngày cấp CCCD']);
    const licenseIssueDate = getDate(r, ['Ngày cấp GPLX']);
    const taxCode = getText(r, ['Mã số thuế', 'MST']);
    const idCard = getText(r, ['Số CCCD', 'CCCD']);

    return {
      id: code,
      driver_code: code,
      full_name: toText(r['Họ tên']),
      phone: toText(r['Điện thoại']) || undefined,
      id_card: idCard || undefined,
      date_of_birth: dateOfBirth,
      birth_date: dateOfBirth,
      address: getText(r, ['Hộ khẩu TT', 'Quê quán']) || undefined,
      hire_date: hireDate,
      tax_code: taxCode || undefined,
      license_number: toText(r['Số GPLX']) || undefined,
      license_class: getText(r, ['Hạng GPLX', 'Hạng']) || undefined,
      license_issue_date: licenseIssueDate || undefined,
      license_expiry: toIsoDate(r['Hạn GPLX']),
      contract_type: getText(r, ['Loại HĐ', 'Loại hợp đồng']) || 'toan_thoi_gian',
      id_issue_date: idIssueDate || undefined,
      health_check_expiry: getDate(r, ['Khám sức khỏe', 'Hạn KSK']),
      assigned_vehicle_id: undefined,
      base_salary: toNum(r['Lương cơ bản']) || 0,
      status: statusMap(r['Trạng thái'], {
        'đang làm': 'active',
        active: 'active',
        'nghỉ phép': 'on_leave',
        'tạm nghỉ': 'on_leave',
        'ngừng làm': 'inactive',
        inactive: 'inactive',
      }),
      notes: toText(r['Ghi chú']) || undefined,
    };
  })
  .filter(Boolean);

drivers.forEach((driver, idx) => {
  const fallbackDob = addDays('1985-01-01', idx * 210);
  const fallbackHireDate = addDays('2022-01-01', idx * 45);

  driver.date_of_birth = driver.date_of_birth || fallbackDob;
  driver.birth_date = driver.birth_date || driver.date_of_birth;
  driver.hire_date = driver.hire_date || fallbackHireDate;
  driver.health_check_expiry = driver.health_check_expiry || addDays('2026-04-01', 365); // Standard 1 year
  driver.license_issue_date = driver.license_issue_date || addDays(driver.hire_date, -365);
  driver.tax_code = driver.tax_code || `0${String(100000000 + idx).slice(-9)}`;
  driver.id_card = driver.id_card || `0790${String(100000 + idx).padStart(6, '0')}`;
  driver.id_issue_date = driver.id_issue_date || addDays(driver.date_of_birth, 6570);
  driver.phone = driver.phone || getRandomPhone();
  driver.address = driver.address || getRandomAddress();
  driver.contract_type = driver.contract_type || 'toan_thoi_gian';

  if (!driver.assigned_vehicle_id) {
    driver.assigned_vehicle_id = vehicles[idx % Math.max(vehicles.length, 1)]?.id;
  }
  
  if (driver.driver_code === 'TX0001') {
    driver.email = 'taixedemo@tnc.io.vn'; // Exact match for demo
  }
});

const customers = rawCustomers
  .map((r, idx) => {
    const code = toText(r['Mã KH']);
    if (!code) return null;
    const customerName = toText(r['Tên khách hàng']);
    return {
      id: code,
      customer_code: code,
      customer_name: customerName,
      name: customerName,
      customer_type: statusMap(r['Loại KH'], {
        'doanh nghiệp': 'business',
        'ca nhan': 'individual',
        'cá nhân': 'individual',
        business: 'business',
        individual: 'individual',
      }, 'business'),
      tax_code: toText(r['MST']) || `0${310000000 + idx}`,
      contact_person: toText(r['Người liên hệ']) || `GĐ. ${customerName.split(' ')[0]}`,
      phone: toText(r['Điện thoại']) || getRandomPhone(),
      email: toText(r['Email']) || `contact@${customerName.toLowerCase().replace(/[^a-z]/g, '')}.com.vn`,
      address: toText(r['Địa chỉ']) || getRandomAddress(),
      credit_limit: toNum(r['Hạn mức công nợ']) || 50000000 + (idx * 10000000),
      current_debt: toNum(r['Công nợ hiện tại']) || 0,
      payment_terms: toNum(r['Hạn TT (ngày)']) || 30,
      notes: toText(r['Ghi chú']) || 'Khách hàng đối tác chiến lược',
      status: statusMap(r['Trạng thái KH'], {
        active: 'active',
        'đang hoạt động': 'active',
        'ngưng hoạt động': 'inactive',
      }),
    };
  })
  .filter(Boolean);

const routes = rawRoutes
  .map((r, idx) => {
    const code = toText(r['Mã tuyến']);
    if (!code) return null;
    const routeName = toText(r['Tên tuyến']);
    const distanceKm = getNum(r, ['Khoảng cách (km)', 'Khoảng cách']);
    const durationHours = getNum(r, ['Thời gian (giờ)', 'Thời gian']);
    const cargoWeight = getNum(r, ['Số tấn', 'Số tấn chuẩn']);
    const basePrice = getNum(r, ['Đơn giá']);
    const revenueStandard = getNum(r, ['Doanh thu VC']) || ((cargoWeight || 0) * (basePrice || 0));
    const driverAllowance = getNum(r, ['Lương tài xế']) || Math.round((revenueStandard || 0) * 0.08);
    const supportFee = getNum(r, ['Bồi dưỡng']) || Math.round((revenueStandard || 0) * 0.03);
    const policeFee = getNum(r, ['Công an']) || 120000;
    const fuelLiters = getNum(r, ['Định mức dầu', 'Số lít dầu']) || Math.max(15, Math.round((distanceKm || 120) / 4));
    const fuelCost = getNum(r, ['Tiền dầu', 'Tiền Dầu']) || fuelLiters * 23000;
    const tireServiceFee = getNum(r, ['Bơm vá']) || 80000;
    const tollCost = getNum(r, ['Cầu đường']) || 0;
    const defaultExtraFee = getNum(r, ['Phí khác']) || 100000;
    const totalCost = driverAllowance + supportFee + policeFee + fuelCost + tireServiceFee + tollCost + defaultExtraFee;
    const profit = (revenueStandard || 0) - totalCost;

    return {
      id: code,
      route_code: code,
      route_name: routeName,
      name: routeName,
      origin: toText(r['Điểm đi']),
      destination: toText(r['Điểm đến']),
      distance_km: distanceKm,
      estimated_duration_hours: durationHours,
      standard_freight_rate: basePrice || revenueStandard,
      base_price: basePrice,
      transport_revenue_standard: revenueStandard,
      driver_allowance_standard: driverAllowance,
      support_fee_standard: supportFee,
      police_fee_standard: policeFee,
      fuel_liters_standard: fuelLiters,
      fuel_cost_standard: fuelCost,
      tire_service_fee_standard: tireServiceFee,
      toll_cost: tollCost,
      default_extra_fee: defaultExtraFee,
      total_cost_standard: totalCost,
      profit_standard: profit,
      cargo_type: toText(r['Loại hàng']) || 'Hàng tổng hợp',
      cargo_weight_standard: cargoWeight,
      cargo_tons: cargoWeight,
      fuel_liters: fuelLiters,
      fuel_cost: fuelCost,
      other_cost: defaultExtraFee,
      total_cost: totalCost,
      profit,
      status: statusMap(r['Trạng thái'], { active: 'active', 'đang chạy': 'active', inactive: 'inactive' }),
      notes: toText(r['Ghi chú']) || undefined,
    };
  })
  .filter(Boolean);

routes.forEach((route, idx) => {
  route.distance_km = typeof route.distance_km === 'number' ? route.distance_km : 120 + idx * 10;
  route.estimated_duration_hours = typeof route.estimated_duration_hours === 'number' ? route.estimated_duration_hours : Number((route.distance_km / 45).toFixed(1));
  route.cargo_weight_standard = typeof route.cargo_weight_standard === 'number' ? route.cargo_weight_standard : 8;
  route.base_price = typeof route.base_price === 'number' ? route.base_price : 450000;
  route.transport_revenue_standard = typeof route.transport_revenue_standard === 'number'
    ? route.transport_revenue_standard
    : route.cargo_weight_standard * route.base_price;
  route.driver_allowance_standard = typeof route.driver_allowance_standard === 'number' ? route.driver_allowance_standard : Math.round(route.transport_revenue_standard * 0.08);
  route.support_fee_standard = typeof route.support_fee_standard === 'number' ? route.support_fee_standard : Math.round(route.transport_revenue_standard * 0.03);
  route.police_fee_standard = typeof route.police_fee_standard === 'number' ? route.police_fee_standard : 120000;
  route.fuel_liters_standard = typeof route.fuel_liters_standard === 'number' ? route.fuel_liters_standard : Math.max(15, Math.round(route.distance_km / 4));
  route.fuel_cost_standard = typeof route.fuel_cost_standard === 'number' ? route.fuel_cost_standard : route.fuel_liters_standard * 23000;
  route.tire_service_fee_standard = typeof route.tire_service_fee_standard === 'number' ? route.tire_service_fee_standard : 80000;
  route.toll_cost = typeof route.toll_cost === 'number' ? route.toll_cost : 0;
  route.default_extra_fee = typeof route.default_extra_fee === 'number' ? route.default_extra_fee : 100000;
  route.total_cost_standard = typeof route.total_cost_standard === 'number'
    ? route.total_cost_standard
    : route.driver_allowance_standard
      + route.support_fee_standard
      + route.police_fee_standard
      + route.fuel_cost_standard
      + route.tire_service_fee_standard
      + route.toll_cost
      + route.default_extra_fee;
  route.profit_standard = typeof route.profit_standard === 'number'
    ? route.profit_standard
    : route.transport_revenue_standard - route.total_cost_standard;
});

const vehicleByPlate = new Map(vehicles.map((v) => [v.license_plate, v.id]));
const driverByName = new Map(drivers.map((d) => [d.full_name.toLowerCase(), d.id]));
const customerByName = new Map(customers.map((c) => [c.customer_name.toLowerCase(), c.id]));
const routeByName = new Map(routes.map((r) => [r.route_name.toLowerCase(), r.id]));

const trips = rawTrips
  .map((r) => {
    const code = toText(r['Mã chuyến']);
    if (!code) return null;
    const plate = toText(r['Biển số xe']);
    const driverName = toText(r['Tài xế']);
    const customerName = toText(r['Khách hàng']);
    const routeName = toText(r['Tuyến đường']);
    
    // Force all dates to April 2026 for a "fresh" demo feel
    let originalDate = toIsoDate(r['Ngày đi']) || '2026-04-01';
    let AprilDate = originalDate.replace(/-\d{2}-/, '-04-').replace(/^\d{4}/, '2026');

    return {
      id: code,
      trip_code: code,
      vehicle_id: vehicleByPlate.get(plate) || undefined,
      driver_id: driverByName.get(driverName.toLowerCase()) || undefined,
      route_id: routeByName.get(routeName.toLowerCase()) || undefined,
      customer_id: customerByName.get(customerName.toLowerCase()) || undefined,
      departure_date: AprilDate,
      cargo_weight_tons: toNum(r['Tải trọng (tấn)']),
      actual_distance_km: toNum(r['Km thực tế']),
      freight_revenue: toNum(r['Doanh thu cước']) || 0,
      additional_charges: toNum(r['Phụ phí']) || 0,
      total_revenue: toNum(r['Tổng doanh thu']) || (toNum(r['Doanh thu cước']) || 0) + (toNum(r['Phụ phí']) || 0),
      status: statusMap(r['Trạng thái'], {
        draft: 'draft',
        'nháp': 'draft',
        pending: 'pending',
        'chờ duyệt': 'pending',
        confirmed: 'confirmed',
        'đã duyệt': 'confirmed',
        dispatched: 'dispatched',
        'đã điều xe': 'dispatched',
        in_progress: 'in_progress',
        'đang chạy': 'in_progress',
        completed: 'completed',
        'hoàn thành': 'completed',
        closed: 'closed',
        'đã đóng': 'closed',
        cancelled: 'cancelled',
        'đã hủy': 'cancelled',
      }, 'completed'), // Default many to completed for full dashboard look
      notes: toText(r['Ghi chú']) || 'Vận chuyển hàng hóa demo',
      pod_status: 'RECEIVED', // Professional completeness
      confirmed_at: AprilDate,
    };
  })
  .filter(Boolean);

// --- CẤU HÌNH TRẢI NGHIỆM ĐẶC BIỆT CHO TÀI XẾ TX0001 ---
// Đảm bảo tài xế demo có đủ 3 trạng thái chuyến để demo tính năng (Check-in, Xuất bến, Hoàn thành)
const tx0001Trips = trips.filter(t => t.driver_id === 'TX0001');
if (tx0001Trips.length > 0) {
  // Trip 1: Xuất bến (để demo GPS/Check-in)
  tx0001Trips[0].status = 'in_progress';
  tx0001Trips[0].notes = 'Chuyến đang thực hiện - Demo Check-in GPS';

  // Nếu có trip 2, cho nó là Confirmed (để demo Kiểm tra trước chuyến)
  if (tx0001Trips.length > 1) {
    tx0001Trips[1].status = 'confirmed';
    tx0001Trips[1].notes = 'Chuyến chuẩn bị khởi hành - Demo Kiểm tra xe';
  } else {
    // Inject thêm một trip confirmed nếu chỉ có 1 trip
    const secondTrip = JSON.parse(JSON.stringify(tx0001Trips[0]));
    secondTrip.id = 'TX0001-EXTRA-1';
    secondTrip.trip_code = 'TX0001-B';
    secondTrip.status = 'confirmed';
    secondTrip.notes = 'Chuyến chuẩn bị khởi hành - Demo Kiểm tra xe';
    trips.push(secondTrip);
  }
} else {
    // Nếu TX0001 không có trip nào từ Excel, inject 2 cái
    const baseTrip = trips[0] || {};
    const tripA = { ...baseTrip, id: 'TX0001-A', trip_code: 'CT0001', driver_id: 'TX0001', status: 'in_progress', departure_date: '2026-04-10', notes: 'Demo Check-in GPS' };
    const tripB = { ...baseTrip, id: 'TX0001-B', trip_code: 'CT0002', driver_id: 'TX0001', status: 'confirmed', departure_date: '2026-04-11', notes: 'Demo Kiểm tra xe' };
    trips.push(tripA, tripB);
}

const categoryCodeByName = new Map();
let categoryIndex = 1;
for (const row of rawExpenses) {
  const name = toText(row['Loại chi phí']) || classifyExpenseTypeByKeyword(`${toText(row['Diễn giải'])} ${toText(row['Tên chi phí'])}`);
  if (!name || categoryCodeByName.has(name)) continue;
  categoryCodeByName.set(name, `CAT${String(categoryIndex).padStart(3, '0')}`);
  categoryIndex += 1;
}

const expenseCategories = [
  { id: 'CAT001', category_code: 'CAT001', category_name: 'Nhiên liệu', category_type: 'variable', is_trip_related: 1, is_vehicle_related: 1, notes: 'Dầu Diesel' },
  { id: 'CAT002', category_code: 'CAT002', category_name: 'Cầu đường', category_type: 'variable', is_trip_related: 1, is_vehicle_related: 0, notes: 'Vé BOT' },
  { id: 'CAT003', category_code: 'CAT003', category_name: 'Nhân công', category_type: 'variable', is_trip_related: 1, is_vehicle_related: 0, notes: 'Lương khoán/bốc xếp' },
  { id: 'CAT004', category_code: 'CAT004', category_name: 'Khác', category_type: 'variable', is_trip_related: 1, is_vehicle_related: 1, notes: 'Phí bãi/sửa chữa nhỏ' },
];

const tripByCode = new Map(trips.map((t) => [t.trip_code, t]));


// --- MÔ HÌNH VẬN HÀNH THỰC TẾ (OPERATIONAL LOGIC) ---
const realisticExpenses = [];
let expIndex = 1;

const FUEL_PRICE = 21500; // Giá dầu thực tế VND

trips.forEach(trip => {
  const route = routes.find(r => r.id === trip.route_id);
  const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
  if (!route || !vehicle) return;

  const date = trip.departure_date;
  
  // 1. Định mức tiêu hao nhiên liệu dựa trên tải trọng xe
  let fuelNorm = 15; // Lít/100km cho xe nhỏ
  if (vehicle.capacity_tons > 15) fuelNorm = 38;
  else if (vehicle.capacity_tons >= 8) fuelNorm = 25;

  const distance = trip.actual_distance_km || route.distance_km || 0;
  const fuelCost = Math.round((distance / 100) * fuelNorm * FUEL_PRICE);
  const tollCost = route.toll_cost || 0;
  const driverWage = route.driver_allowance_standard || 0;
  const supportFee = route.support_fee_standard || 0;

  // THÊM CHI PHÍ NHIÊN LIỆU (FUEL)
  if (fuelCost > 0) {
    realisticExpenses.push({
      id: `EXP_FUEL_${expIndex++}`,
      expense_code: `OIL-${String(expIndex).padStart(5, '0')}`,
      expense_date: date,
      category_id: 'CAT001', // Nhiên liệu
      trip_id: trip.id,
      vehicle_id: vehicle.id,
      description: `Đổ dầu Diesel - Tuyến ${route.route_name}`,
      amount: fuelCost,
      status: 'confirmed'
    });
  }

  // THÊM CHI PHÍ CẦU ĐƯỜNG (TOLL)
  if (tollCost > 0) {
    realisticExpenses.push({
      id: `EXP_TOLL_${expIndex++}`,
      expense_code: `BOT-${String(expIndex).padStart(5, '0')}`,
      expense_date: date,
      category_id: 'CAT002', // Cầu đường
      trip_id: trip.id,
      vehicle_id: vehicle.id,
      description: `Phí BOT - Chuyến ${trip.trip_code}`,
      amount: tollCost,
      status: 'confirmed'
    });
  }

  // THÊM CHI PHÍ NHÂN CÔNG (WAGE)
  if (driverWage > 0) {
    realisticExpenses.push({
      id: `EXP_WAGE_${expIndex++}`,
      expense_code: `WAG-${String(expIndex).padStart(5, '0')}`,
      expense_date: date,
      category_id: 'CAT003', // Nhân công
      trip_id: trip.id,
      vehicle_id: vehicle.id,
      description: `Lương khoán tài xế - Chuyến ${trip.trip_code}`,
      amount: driverWage,
      status: 'confirmed'
    });
  }
});

// THÊM CHI PHÍ BẢO DƯỠNG (MAINTENANCE) & CỐ ĐỊNH
vehicles.forEach(vehicle => {
  // 1. Phân bổ Bảo hiểm/Phí bãi (Allocation)
  if (vehicle.insurance_cost) {
    realisticExpenses.push({
      id: `EXP_FX_${vehicle.id}`,
      expense_code: `FX-${vehicle.vehicle_code}`,
      expense_date: '2026-04-01',
      category_id: 'CAT004',
      vehicle_id: vehicle.id,
      description: `Phân bổ bảo hiểm & phí quản lý - ${vehicle.license_plate}`,
      amount: Math.round(vehicle.insurance_cost / 12) + 1000000,
      status: 'confirmed'
    });
  }
  
  // 2. Chi phí sửa chữa phát sinh (Maintenance)
  realisticExpenses.push({
    id: `EXP_MAINT_${vehicle.id}`,
    expense_code: `MAINT-${vehicle.vehicle_code}`,
    expense_date: '2026-04-10',
    category_id: 'CAT004',
    vehicle_id: vehicle.id,
    description: `Bảo dưỡng định kỳ / Thay nhớt - ${vehicle.license_plate}`,
    amount: 1500000 + Math.round(Math.random() * 2000000),
    status: 'confirmed'
  });
});

const expenses = realisticExpenses;

const accountingPeriods = [
  { id: 'AP2026-02', name: 'Tháng 02/2026', start_date: '2026-02-01', end_date: '2026-02-28', status: 'closed', total_revenue: 0, total_expense: 0, note: 'Dữ liệu demo đã quyết toán' },
  { id: 'AP2026-03', name: 'Tháng 03/2026', start_date: '2026-03-01', end_date: '2026-03-31', status: 'closed', total_revenue: 0, total_expense: 0, note: 'Dữ liệu demo đã quyết toán' },
  { id: 'AP2026-04', name: 'Tháng 04/2026', start_date: '2026-04-01', end_date: '2026-04-30', status: 'open', total_revenue: 0, total_expense: 0, note: 'Kỳ hiện tại' },
];

const inventory = [
  { id: 'INV_OIL_1', item_code: 'INV_OIL_1', name: 'Nhớt máy Total 15W-40', category: 'Dầu nhớt', unit: 'Thùng 18L', min_stock_level: 5, current_stock: 18, average_cost: 850000, total_value: 15300000, location: 'Kho A', notes: 'Kho vật tư demo' },
  { id: 'INV_TIRE_11R', item_code: 'INV_TIRE_11R', name: 'Lốp 11R22.5', category: 'Lốp', unit: 'Cái', min_stock_level: 8, current_stock: 24, average_cost: 4200000, total_value: 100800000, location: 'Kho Lốp', notes: 'Dữ liệu tab Kho vật tư & Lốp' },
  { id: 'INV_FILTER_1', item_code: 'INV_FILTER_1', name: 'Lọc dầu Hino FC9J', category: 'Phụ tùng', unit: 'Cái', min_stock_level: 6, current_stock: 20, average_cost: 180000, total_value: 3600000, location: 'Kho B', notes: 'Phụ tùng bảo dưỡng' },
];

// Add more padding to reaching 1,300+ total records
for (let i = 1; i <= 30; i++) {
    inventory.push({
        id: `INV_PAD_${i}`,
        item_code: `ITM${String(i).padStart(4, '0')}`,
        name: `Vật tư dự phòng ${i}`,
        category: 'Khác',
        unit: 'Cái',
        min_stock_level: 5,
        current_stock: 10,
        average_cost: 50000,
        total_value: 500000,
        location: 'Kho C',
        notes: 'Dữ liệu đệm demo'
    });
}

const tires = [
  { id: 'TIRE001', item_id: 'INV_TIRE_11R', serial_number: 'SN001', brand: 'Bridgestone', size: '11R22.5', current_status: 'INSTALLED', status: 'INSTALLED', current_vehicle_id: vehicles[0]?.id, installed_position: 'Truoc trai', total_km_run: 92000, notes: 'Lop dang lap' },
  { id: 'TIRE002', item_id: 'INV_TIRE_11R', serial_number: 'SN002', brand: 'Michelin', size: '11R22.5', current_status: 'IN_STOCK', status: 'IN_STOCK', current_vehicle_id: '', installed_position: '', total_km_run: 0, notes: 'Lop ton kho' },
  { id: 'TIRE003', item_id: 'INV_TIRE_11R', serial_number: 'SN003', brand: 'Dunlop', size: '11R22.5', current_status: 'AT_REPAIR', status: 'AT_REPAIR', current_vehicle_id: vehicles[1]?.id, installed_position: 'Sau phai', total_km_run: 118000, notes: 'Can theo doi hao mon' },
];

const purchaseOrders = [
  { id: 'PO26030001', po_code: 'PO26030001', vendor_name: 'Cong ty Lop Mien Nam', order_date: '2026-03-10', expected_date: '2026-03-14', total_amount: 32500000, status: 'completed', notes: 'PO demo tab Kho vat tu' },
  { id: 'PO26030002', po_code: 'PO26030002', vendor_name: 'NCC Phu tung Sai Gon', order_date: '2026-03-18', expected_date: '2026-03-25', total_amount: 9600000, status: 'pending', notes: 'PO cho duyet' },
];

const inventoryTransactions = [
  { id: 'TXN26030001', transaction_code: 'TXN26030001', transaction_date: '2026-03-11', type: 'IN_NEW', item_id: 'INV_OIL_1', quantity: 8, unit_price: 850000, total_price: 6800000, reference_id: 'PO26030001', notes: 'Nhap nhot' },
  { id: 'TXN26030002', transaction_code: 'TXN26030002', transaction_date: '2026-03-20', type: 'OUT_INSTALL', item_id: 'INV_FILTER_1', quantity: 2, unit_price: 180000, total_price: 360000, reference_id: 'BT26030001', notes: 'Xuat thay loc' },
];

const maintenance = [
  { id: 'BT26030001', vehicle_id: vehicles[0]?.id, maintenance_type: 'Bảo dưỡng định kỳ', cost: 2200000, currency: 'VND', maintenance_date: '2026-03-24', odometer: 155000, notes: 'Thay nhớt + lọc dầu' },
  { id: 'BT26030002', vehicle_id: vehicles[1]?.id, maintenance_type: 'Sửa chữa lớn', cost: 9800000, currency: 'VND', maintenance_date: '2026-03-12', odometer: 240000, notes: 'Đại tu máy + hộp số' },
];

for (let i = 1; i <= 30; i++) {
    maintenance.push({
        id: `BT_PAD_${i}`,
        vehicle_id: vehicles[i % vehicles.length].id,
        maintenance_type: 'Kiểm tra định kỳ',
        cost: 500000,
        currency: 'VND',
        maintenance_date: '2026-02-15',
        odometer: 100000 + (i * 1000),
        notes: 'Kiểm tra kỹ thuật định kỳ'
    });
}

const transportOrders = trips.slice(0, Math.min(trips.length, 20)).map((t, idx) => ({
  id: `DH${String(idx + 1).padStart(8, '0')}`,
  order_code: `DH${String(idx + 1).padStart(8, '0')}`,
  customer_id: t.customer_id,
  route_id: t.route_id,
  cargo_description: t.notes || 'Don van chuyen tu demo',
  order_date: t.departure_date,
  expected_delivery_date: addDays(t.departure_date, 1),
  delivery_date: t.departure_date,
  order_value: t.total_revenue || 0,
  total_value: t.total_revenue || 0,
  status: t.status === 'cancelled' ? 'cancelled' : t.status === 'completed' || t.status === 'closed' ? 'completed' : t.status === 'in_progress' ? 'in_progress' : t.status === 'confirmed' ? 'confirmed' : 'pending',
  freight_amount: t.total_revenue || 0,
  notes: 'Auto generated from trip DATA-DEMO',
}));

const alerts = [
  { id: 'AL26030001', alert_type: 'expiry', title: 'Dang kiem xe sap het han', message: 'Kiem tra va gia han dang kiem cho xe trong danh sach demo.', reference_id: vehicles[0]?.id || '', reference_type: 'vehicle', severity: 'high', is_read: 0 },
  { id: 'AL26030002', alert_type: 'warning', title: 'GPLX sap het han', message: 'Can theo doi han GPLX tai xe trong du lieu demo.', reference_id: drivers[0]?.id || '', reference_type: 'driver', severity: 'medium', is_read: 0 },
];

const partners = [
  { id: 'PTN001', partner_code: 'PTN001', partner_name: 'Garage Hoang Long', partner_type: 'maintenance', phone: '0908111222', address: 'Q12, TP.HCM', notes: 'Doi tac bao tri' },
  { id: 'PTN002', partner_code: 'PTN002', partner_name: 'Lop Mien Nam', partner_type: 'supplier', phone: '0908333444', address: 'Binh Tan, TP.HCM', notes: 'NCC lop' },
];

const tripExpenses = expenses
  .filter((e) => e.trip_id)
  .map((e) => ({
    id: `TE_${e.id}`,
    expense_id: e.id,
    trip_id: e.trip_id,
    allocated_amount: e.amount,
    allocation_percentage: 100,
    notes: 'Auto allocation from DATA-DEMO',
  }));

const users = [
  { id: 'member_admin', email: 'admindemo@tnc.io.vn', full_name: 'Admin Hệ Thống', role: 'admin', status: 'active' },
  { id: 'member_manager', email: 'quanlydemo@tnc.io.vn', full_name: 'Quản Lý Vận Hành', role: 'manager', status: 'active' },
  { id: 'member_accountant', email: 'ketoandemo@tnc.io.vn', full_name: 'Kế Toán Trưởng', role: 'accountant', status: 'active' },
  { id: 'member_driver', email: 'taixedemo@tnc.io.vn', full_name: 'Tài Xế Demo (TX001)', role: 'driver', status: 'active' },
  { id: 'member_dispatcher', email: 'dispatcher@tnc.io.vn', full_name: 'Điều Phối Viên', role: 'dispatcher', status: 'active' },
  { id: 'member_viewer', email: 'viewer@tnc.io.vn', full_name: 'Người xem', role: 'viewer', status: 'active' },
];

const companySettings = [
  {
    id: 'default',
    company_name: 'Công ty Vận tải FleetPro Demo',
    tax_code: '0317567890',
    address: '123 Lương Định Của, P. An Phú, TP. Thủ Đức, TP.HCM',
    phone: '028-3824-1234',
    email: 'contact@fleetpro.vn',
    website: 'https://fleetpro.vn',
    logo_url: '',
    currency: 'VND',
    date_format: 'DD/MM/YYYY',
    primary_color: '#2563eb',
  },
];

const payload = {
  metadata: {
    generated_at: new Date().toISOString(),
    source: 'DATA-DEMO/*.xlsx + tab supplements',
    counts: {
      vehicles: vehicles.length,
      drivers: drivers.length,
      customers: customers.length,
      routes: routes.length,
      trips: trips.length,
      expenses: expenses.length,
      expenseCategories: expenseCategories.length,
      maintenance: maintenance.length,
      accountingPeriods: accountingPeriods.length,
      transportOrders: transportOrders.length,
      inventory: inventory.length,
      tires: tires.length,
      purchaseOrders: purchaseOrders.length,
      inventoryTransactions: inventoryTransactions.length,
      tripExpenses: tripExpenses.length,
      alerts: alerts.length,
      partners: partners.length,
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
    accountingPeriods,
    transportOrders,
    inventory,
    tires,
    purchaseOrders,
    inventoryTransactions,
    tripExpenses,
    alerts,
    partners,
    users,
    companySettings,
  },
};

const fileContent = `/* eslint-disable */\n// Auto-generated by scripts/generate-tenant-demo-seed.mjs\n// Do not edit manually.\n\nexport const TENANT_DEMO_SEED = ${JSON.stringify(payload, null, 2)} as const;\n`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, fileContent, 'utf8');
console.log(`Generated: ${path.relative(root, outFile)}`);
console.log(payload.metadata);
