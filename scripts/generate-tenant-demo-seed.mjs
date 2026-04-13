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

const PHONE_PREFIXES = ['090', '091', '098', '097', '093', '035', '038'];
const getRandomPhone = () => `${getRandomItem(PHONE_PREFIXES)}${getRandomInt(1000000, 9999999)}`;

const CITIES = ['TP.HCM', 'Bình Dương', 'Đồng Nai', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];
const STREETS = ['Lê Lợi', 'Nguyễn Huệ', 'Trần Hưng Đạo', 'Cách Mạng Tháng 8', 'Lý Tự Trọng', 'Hai Bà Trưng', 'Phan Xích Long'];
const WARDS = ['Phường 1', 'Phường Bến Thành', 'Phường Đa Kao', 'Phường 15', 'Phường 5'];
const DISTRICTS = ['Quận 1', 'Quận 3', 'Quận Phú Nhuận', 'Quận Tân Bình', 'Quận Bình Thạnh'];
const getRandomAddress = (cityIndex = 0) => `${getRandomInt(1, 500)} ${getRandomItem(STREETS)}, ${getRandomItem(WARDS)}, ${getRandomItem(DISTRICTS)}, ${CITIES[cityIndex % CITIES.length]}`;

const TODAY = new Date().toISOString().slice(0, 10);
const DATE_START_DEMO = addDays(TODAY, -30);

// --- Core Entities Generation ---

console.log("🚀 Bắt đầu giả lập Đội Xe Thực Chiến (Procedural Generation)...");

// 1. Settings & Users & Categories
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

const users = [
  { id: 'admin_phuan', email: 'admin@phuancr.com', full_name: 'Admin Phú An', role: 'admin', status: 'active' },
  { id: 'quanly_phuan', email: 'quanly@phuancr.com', full_name: 'Quản Lý Phú An', role: 'manager', status: 'active' },
  { id: 'ketoan_phuan', email: 'ketoan@phuancr.com', full_name: 'Kế Toán Phú An', role: 'accountant', status: 'active' },
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `taixe_${i + 1}_phuan`,
    email: `taixe${i + 1}@phuancr.com`,
    full_name: `Tài xế ${i + 1}`,
    role: 'driver',
    status: 'active'
  }))
];

const expenseCategories = [
  { id: 'CAT001', category_code: 'CAT001', category_name: 'Nhiên liệu', category_type: 'variable', is_trip_related: 1, is_vehicle_related: 1, notes: 'Sử dụng cho đổ dầu Diesel' },
  { id: 'CAT002', category_code: 'CAT002', category_name: 'Cầu đường', category_type: 'variable', is_trip_related: 1, is_vehicle_related: 0, notes: 'Vé qua trạm BOT tự động/thủ công' },
  { id: 'CAT003', category_code: 'CAT003', category_name: 'Công tác phí', category_type: 'variable', is_trip_related: 1, is_vehicle_related: 0, notes: 'Lương đi chuyến, bồi dưỡng bốc xếp' },
  { id: 'CAT004', category_code: 'CAT004', category_name: 'Bảo dưỡng - Phụ tùng', category_type: 'variable', is_trip_related: 0, is_vehicle_related: 1, notes: 'Thay nhớt, bảo trì, mua phụ kiện' },
  { id: 'CAT005', category_code: 'CAT005', category_name: 'Chi phí văn phòng', category_type: 'fixed', is_trip_related: 0, is_vehicle_related: 0, notes: 'Thuê bãi, mạng, nước' },
];

// 2. Customers
const CUSTOMER_NAMES = [
  'CÔNG TY CP THÉP HÒA PHÁT', 'TẬP ĐOÀN HOA SEN', 'CTY TNHH NƯỚC GIẢI KHÁT SUNTORY PEPSICO', 'CTY CP SỮA VIỆT NAM (VINAMILK)', 
  'CTY TNHH UNILEVER VIỆT NAM', 'CTCP HÀNG TIÊU DÙNG MASAN', 'CTCP KINH ĐÔ', 'CTY TNHH NESTLE VIỆT NAM', 'TỔNG CTY BIA RƯỢU NGK SÀI GÒN', 'CTY TNHH SAMSUNG ELECTRONICS'
];
const customers = CUSTOMER_NAMES.map((name, i) => {
  const code = generateId('KH', i + 1);
  return {
    id: code,
    customer_code: code,
    customer_name: name,
    name: name,
    customer_type: 'business',
    tax_code: `03${getRandomInt(10000000, 99999999)}`,
    contact_person: `Ông/Bà ${name.split(' ').slice(2).join(' ')}`,
    phone: getRandomPhone(),
    email: `contact@${code.toLowerCase()}.vn`,
    address: getRandomAddress(i),
    credit_limit: getRandomItem([100000000, 200000000, 500000000]),
    current_debt: 0, // Will be calculated after trips
    payment_terms: 30,
    status: 'active',
  };
});

// 3. Vehicles
const VEHICLE_MODELS = [
  { capacity: 1.5, type: 'Xe tải nhẹ', brand: 'Kia', fuelRate: 10,  baseOdo: 80000 },
  { capacity: 3.5, type: 'Xe tải trung', brand: 'Isuzu', fuelRate: 14, baseOdo: 120000 },
  { capacity: 8,   type: 'Xe tải nặng', brand: 'Hino', fuelRate: 22,  baseOdo: 180000 },
  { capacity: 15,  type: 'Xe đầu kéo', brand: 'Hyundai', fuelRate: 35, baseOdo: 250000 },
  { capacity: 20,  type: 'Xe container', brand: 'Maxxforce', fuelRate: 42, baseOdo: 300000 },
];

const vehicleLocations = ['Bãi xe Quận 12', 'Bãi xe Sóng Thần', 'Bãi Phú Mỹ'];

const vehicles = [];
for (let i = 1; i <= 20; i++) {
  const code = generateId('XE', i);
  const model = getRandomItem(VEHICLE_MODELS);
  
  // Real world assignment logic: 80% fixed to one driver, 20% pool
  const assignmentType = i <= 16 ? 'fixed' : 'pool'; 
  
  vehicles.push({
    id: code,
    vehicle_code: code,
    license_plate: `${getRandomInt(51, 93)}C-${getRandomInt(100, 999)}.${getRandomInt(10, 99)}`,
    vehicle_type: model.type,
    brand: model.brand,
    capacity_tons: model.capacity,
    fuel_type: 'Diesel',
    usage_limit_years: `${new Date().getFullYear() + 20}`,
    engine_number: `ENG-${code}-${getRandomInt(1000, 9999)}`,
    chassis_number: `CHS-${code}-${getRandomInt(1000, 9999)}`,
    insurance_purchase_date: addDays(TODAY, -getRandomInt(30, 300)),
    insurance_expiry_date: addDays(TODAY, getRandomInt(60, 300)), // Guarantee no immediate expiry, we'll manually set one for alert later
    registration_date: addDays(TODAY, -getRandomInt(30, 150)),
    registration_expiry_date: addDays(TODAY, getRandomInt(30, 150)),
    insurance_cost: model.capacity > 8 ? 15000000 : 4500000,
    registration_cost: 350000,
    current_location: getRandomItem(vehicleLocations),
    current_odometer: model.baseOdo + getRandomInt(1000, 5000), // Base odometer
    assignment_type: assignmentType,
    status: 'active',
    fuelRateNorm: model.fuelRate, // Temporary mathematical variable
  });
}

// 4. Drivers
const drivers = [];
let fDriverIndex = 0;
for (let i = 1; i <= 25; i++) {
  const code = generateId('TX', i);
  const isFixed = i <= 16;
  const assignedBusStr = isFixed ? vehicles[fDriverIndex].id : undefined;
  
  const licenseClasses = ['C', 'FC', 'E'];
  
  drivers.push({
    id: code,
    driver_code: code,
    full_name: i === 1 ? 'Phan Ngọc Khánh' : `Tài xế Nguyễn Văn ${String.fromCharCode(65 + i)}`,
    email: i === 1 ? 'taixedemo@tnc.io.vn' : `driver${i}@fleetpro.vn`,
    phone: getRandomPhone(),
    id_card: `0790${getRandomInt(100000, 999999).toString().padStart(6, '0')}`,
    date_of_birth: addDays(TODAY, -getRandomInt(8000, 15000)), // 22 - 40 years old
    birth_date: addDays(TODAY, -getRandomInt(8000, 15000)),
    address: getRandomAddress(i % 3),
    hire_date: addDays(TODAY, -getRandomInt(100, 1000)),
    license_number: `1100${getRandomInt(10000000, 99999999)}`,
    license_class: getRandomItem(licenseClasses),
    license_expiry: addDays(TODAY, getRandomInt(100, 1500)),
    health_check_expiry: addDays(TODAY, getRandomInt(30, 300)),
    assigned_vehicle_id: assignedBusStr,
    base_salary: 5000000,
    status: 'active',
  });
  
  // Assign reciprocal to vehicle
  if (isFixed) {
    vehicles[fDriverIndex].assigned_driver_id = code;
    vehicles[fDriverIndex].default_driver_id = code;
    fDriverIndex++;
  }
}

// 5. Routes (Mathematically realistic)
const ROUTES_DEF = [
  { origin: 'Cát Lái, TP.HCM', dest: 'KCN Sóng Thần, Bình Dương', dist: 35, basePerTon: 80000, tolls: 25000 },
  { origin: 'Tân Tạo, TP.HCM', dest: 'KCN Mỹ Phước, Bình Dương', dist: 55, basePerTon: 110000, tolls: 40000 },
  { origin: 'TP.HCM', dest: 'Biên Hòa, Đồng Nai', dist: 40, basePerTon: 90000, tolls: 20000 },
  { origin: 'Cảng Cát Lái', dest: 'Tây Ninh', dist: 120, basePerTon: 220000, tolls: 70000 },
  { origin: 'TP.HCM', dest: 'Vũng Tàu', dist: 110, basePerTon: 200000, tolls: 105000 },
  { origin: 'Bình Dương', dest: 'Cảng Cái Mép', dist: 80, basePerTon: 160000, tolls: 50000 },
  { origin: 'TP.HCM', dest: 'Cần Thơ', dist: 170, basePerTon: 350000, tolls: 150000 },
  { origin: 'Vĩnh Long', dest: 'TP.HCM', dist: 130, basePerTon: 280000, tolls: 110000 },
  { origin: 'Bình Dương', dest: 'Phan Thiết', dist: 200, basePerTon: 450000, tolls: 120000 },
  { origin: 'TP.HCM', dest: 'Nha Trang', dist: 450, basePerTon: 950000, tolls: 350000 },
  { origin: 'Quy Nhơn', dest: 'Đà Nẵng', dist: 320, basePerTon: 750000, tolls: 250000 },
  { origin: 'Hải Phòng', dest: 'Hà Nội', dist: 120, basePerTon: 250000, tolls: 120000 },
];

const routes = ROUTES_DEF.map((rd, i) => {
  const code = generateId('TD', i + 1);
  return {
    id: code,
    route_code: code,
    route_name: `${rd.origin} - ${rd.dest}`,
    name: `${rd.origin} - ${rd.dest}`,
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

// 6. TRIPS SIMULATOR - The Core Mathematical Engine
const trips = [];
const expenses = [];
const maintenance = [];

const FUEL_PRICE_LITER = 21500;
let tripIndex = 1;
let expenseIndex = 1;
let maintIndex = 1;

// Simulate exactly 30 days
for (let dayOffset = 0; dayOffset <= 30; dayOffset++) {
  const currentSimDate = addDays(DATE_START_DEMO, dayOffset);
  
  // Decide how many trips today (12-18 trips a day to get a good dashboard)
  const tripsToday = getRandomInt(12, 18);
  
  for (let t = 0; t < tripsToday; t++) {
    // 1. Pick a Vehicle
    const v = getRandomItem(vehicles);
    
    // 2. Pick a Driver (Usually assigned, but if Pool, pick random non-assigned)
    let d = null;
    if (v.assignment_type === 'fixed') {
        d = drivers.find(drv => drv.assigned_vehicle_id === v.id);
    } else {
        d = getRandomItem(drivers.filter(drv => !drv.assigned_vehicle_id));
    }
    if (!d) d = drivers[0];
    
    // 3. Pick Customer & Route
    const c = getRandomItem(customers);
    const r = getRandomItem(routes);
    
    // 4. Mathematical Logistics Computations
    const distance = r.distance_km + getRandomInt(-10, 20); // Minor traffic offset
    const cargoTons = v.capacity_tons * (getRandomInt(70, 100) / 100); // 70-100% capacity load
    
    const freightRevenue = Math.round(cargoTons * r.base_price / 1000) * 1000;
    const additionalCharges = getRandomInt(0, 1) === 0 ? 0 : getRandomInt(2, 5) * 100000; // Sometime extra fee
    const totalRevenue = freightRevenue + additionalCharges;
    
    // Expenses computation
    const fuelLiters = Math.round((distance / 100) * v.fuelRateNorm);
    const fuelCost = fuelLiters * FUEL_PRICE_LITER;
    const tollCost = r.toll_cost;
    const driverWage = Math.round(freightRevenue * 0.08); // 8% wage
    
    // Odometer Tracking & Trip Logic
    const startOdo = v.current_odometer;
    const endOdo = startOdo + distance;
    v.current_odometer = endOdo; // Persist logic!
    
    const tripStatus = dayOffset === 30 ? getRandomItem(['confirmed', 'in_progress', 'dispatched']) : 'completed';
    
    const tripId = `CD${String(tripIndex).padStart(5, '0')}`;
    
    const trip = {
      id: tripId,
      trip_code: tripId,
      tenant_id: 'default', // Removed later
      vehicle_id: v.id,
      driver_id: d.id,
      customer_id: c.id,
      route_id: r.id,
      departure_date: currentSimDate,
      arrival_date: tripStatus === 'completed' ? currentSimDate : null,
      cargo_weight_tons: Number(cargoTons.toFixed(1)),
      actual_distance_km: distance,
      start_odometer: startOdo,
      end_odometer: endOdo,
      freight_revenue: freightRevenue,
      additional_charges: additionalCharges,
      total_revenue: totalRevenue,
      fuel_liters: fuelLiters,
      fuel_cost: fuelCost,
      status: tripStatus,
      notes: 'Hàng tiêu dùng',
      pod_status: tripStatus === 'completed' ? 'RECEIVED' : 'PENDING'
    };
    
    trips.push(trip);
    tripIndex++;
    
    if (tripStatus === 'completed') {
        c.current_debt += totalRevenue; // Increase customer debt
    }
    
    // 5. Generate Mathematical Expenses
    // Fuel Expense
    expenses.push({
      id: `PC${String(expenseIndex).padStart(5, '0')}`,
      expense_code: `PC${String(expenseIndex).padStart(5, '0')}`,
      expense_date: currentSimDate,
      category_id: 'CAT001',
      trip_id: tripId,
      vehicle_id: v.id,
      description: `Đổ ${fuelLiters} lít dầu Diesel - ${tripId}`,
      amount: fuelCost,
      status: 'confirmed'
    }); expenseIndex++;
    
    // Toll Expense
    if (tollCost > 0) {
      expenses.push({
        id: `PC${String(expenseIndex).padStart(5, '0')}`,
        expense_code: `PC${String(expenseIndex).padStart(5, '0')}`,
        expense_date: currentSimDate,
        category_id: 'CAT002',
        trip_id: tripId,
        vehicle_id: v.id,
        description: `Phí BOT - ${tripId}`,
        amount: tollCost,
        status: 'confirmed'
      }); expenseIndex++;
    }
    
    // Wage Expense
    expenses.push({
      id: `PC${String(expenseIndex).padStart(5, '0')}`,
      expense_code: `PC${String(expenseIndex).padStart(5, '0')}`,
      expense_date: currentSimDate,
      category_id: 'CAT003',
      trip_id: tripId,
      vehicle_id: v.id,
      description: `Khoán chuyến tài xế - ${tripId}`,
      amount: driverWage,
      status: 'confirmed'
    }); expenseIndex++;
    
    // Check Maintenance logic - every 10,000km
    if (v.current_odometer % 10000 < distance) {
      // Crossed a 10k mile mark! Generate a maintenance expense
      maintenance.push({
        id: `BD${String(maintIndex).padStart(4, '0')}`,
        vehicle_id: v.id,
        maintenance_type: 'Bảo dưỡng định kỳ',
        cost: 2500000,
        currency: 'VND',
        maintenance_date: currentSimDate,
        odometer: v.current_odometer,
        notes: 'Thay nhớt máy, lọc dầu định kỳ',
        status: 'completed'
      }); maintIndex++;
      
      expenses.push({
        id: `PC${String(expenseIndex).padStart(5, '0')}`,
        expense_code: `PC${String(expenseIndex).padStart(5, '0')}`,
        expense_date: currentSimDate,
        category_id: 'CAT004',
        trip_id: null,
        vehicle_id: v.id,
        description: `Bảo dưỡng 10.000km - XE ${v.license_plate}`,
        amount: 2500000,
        status: 'confirmed'
      }); expenseIndex++;
    }
  }
}

// Fixed Cost Generator (e.g. at start of month)
vehicles.forEach(v => {
    expenses.push({
        id: `PC${String(expenseIndex).padStart(5, '0')}`,
        expense_code: `PC${String(expenseIndex).padStart(5, '0')}`,
        expense_date: addDays(TODAY, -20),
        category_id: 'CAT005',
        trip_id: null,
        vehicle_id: v.id,
        description: `Phân bổ hao mòn / Phí bãi - ${v.license_plate}`,
        amount: Math.round(v.insurance_cost / 12) + 1200000,
        status: 'confirmed'
    }); expenseIndex++;
});

// Set specific alert states for Dashboard
vehicles[2].insurance_expiry_date = addDays(TODAY, 5); // Expiry alert trigger
vehicles[2].status = 'active';

vehicles[3].status = 'maintenance'; // Force 1 car into maintenance status

// Cleanup temporary fuelRateNorm fields
vehicles.forEach(v => { delete v.fuelRateNorm; });


// Ensure Tài xế 1 has some trips for their own UI
const driver1Id = drivers[0].id;
const activeTripsForD1 = trips.filter(t => t.driver_id === driver1Id && (t.status === 'in_progress' || t.status === 'dispatched'));
if (activeTripsForD1.length === 0) {
    // Force latest trip to be active
    const lastD1Trip = trips.filter(t => t.driver_id === driver1Id).pop();
    if (lastD1Trip) {
        lastD1Trip.status = 'dispatched';
        lastD1Trip.departure_date = TODAY;
    }
}

const payload = {
  metadata: {
    generated_at: new Date().toISOString(),
    source: 'PROCEDURAL_REALISTIC_SIMULATION',
    counts: {
      vehicles: vehicles.length,
      drivers: drivers.length,
      customers: customers.length,
      routes: routes.length,
      trips: trips.length,
      expenses: expenses.length,
      expenseCategories: expenseCategories.length,
      maintenance: maintenance.length,
      accountingPeriods: 1,
      transportOrders: 0,
      inventory: 0,
      tires: 0,
      purchaseOrders: 0,
      inventoryTransactions: 0,
      tripExpenses: 0,
      alerts: 0,
      partners: 0,
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
    accountingPeriods: [{ id: 'AP2026-04', name: 'Tháng nảy', start_date: DATE_START_DEMO, end_date: TODAY, status: 'open', total_revenue: 0, total_expense: 0 }],
    transportOrders: [],
    inventory: [],
    tires: [],
    purchaseOrders: [],
    inventoryTransactions: [],
    tripExpenses: [],
    alerts: [],
    partners: [],
    users,
    companySettings,
  },
};

const fileContent = `/* eslint-disable */\n// Auto-generated by Procedural Simulator\n// Do not edit manually.\n\nexport const TENANT_DEMO_SEED = ${JSON.stringify(payload, null, 2)} as const;\n`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, fileContent, 'utf8');
fs.writeFileSync(outJson, JSON.stringify(payload, null, 2), 'utf8');

console.log(`✅ Hoàn Tứt! Đã tạo thành công Database Demo Thực Tế V2: ${path.relative(root, outFile)}`);
console.log(`✅ Đã đồng bộ JSON: ${path.relative(root, outJson)}`);
console.log(payload.metadata);
