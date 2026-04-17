import { z } from 'zod';

// ID formats
// ID formats (Hỗ trợ định dạng mới YYMM-NN và định dạng cũ XXXX)
// ID formats (Hỗ trợ định dạng mới YYMM-NN và định dạng tĩnh XXXX)
export const vehicleIdSchema = z.string().regex(/^(VEH-(\d{4}-)+\d+|VEH\d{4}|XE\d{4}|XE\d{4}-\d+)$/, { message: 'Mã xe sai chuẩn (VD: XE0001)' });
export const driverIdSchema = z.string().regex(/^(DRV-(\d{4}-)+\d+|DRV\d{4}|TX\d{4}|TX\d{4}-\d+)$/, { message: 'Mã tài xế sai chuẩn (VD: TX0001)' });
export const tripIdSchema = z.string().regex(/^(TRP-(\d{4}-)+\d+|TRP\d{4}|CD\d{4}|CD\d{4}-\d+|CD-(\d{4}-)+\d+|LĐX-[\w-]+)$/, { message: 'Mã chuyến sai chuẩn (VD: CD-2604-01)' });
export const routeIdSchema = z.string().regex(/^(RT-(\d{4}-)+\d+|RT\d{4}|TD\d{4}|TD\d{4}-\d+)$/, { message: 'Mã tuyến sai chuẩn (VD: TD0001)' });
export const customerIdSchema = z.string().regex(/^(CUS-(\d{4}-)+\d+|CUS\d{4}|KH\d{4}|KH\d{4}-\d+)$/, { message: 'Mã khách hàng sai chuẩn (VD: KH0001)' });
export const orderIdSchema = z.string().regex(/^(ORD-(\d{4}-)+\d+|ORD\d{4}|DH\d{4}|DH\d{4}-\d+|DH-(\d{4}-)+\d+)$/, { message: 'Mã đơn hàng sai chuẩn (VD: DH-2604-01)' });
export const expenseIdSchema = z.string().regex(/^(EXP-(\d{4}-)+[\w\d-]+|EXP\d{4}|PC\d{4}|PC\d{4}-\d+|PC-(\d{4}-)+\d+)$/, { message: 'Mã phiếu chi sai chuẩn (VD: PC-2604-01)' });
export const maintenanceIdSchema = z.string().regex(/^(MNT-(\d{4}-)+\d+|MNT\d{4}|BD\d{4}|BD\d{4}-\d+|BD-(\d{4}-)+\d+)$/, { message: 'Mã bảo dưỡng sai chuẩn (VD: BD-2604-01)' });


// Absolute Financial Sanity
export const amountSchema = z.number().min(0, { message: 'Số tiền/Chi phí phải lớn hơn hoặc bằng 0' });

// Full Schemas (Partial definitions mapped to what's going to firestore)
export const VehicleSchema = z.object({
  id: vehicleIdSchema.optional(),
  'Mã xe': vehicleIdSchema.optional(),
  vehicle_code: vehicleIdSchema.optional(),
  license_plate: z.string().regex(/^[0-9]{2}[A-Z]-[0-9]{3,5}(\.[0-9]{2})?$/, { message: 'Biển số sai chuẩn (VD: 51C-123.45 hoặc 79H-1234)' }),
  vehicle_type: z.string().min(1, { message: 'Bắt buộc nhập loại xe (VD: Đầu kéo, Tải 15 tấn)' }),
  brand: z.string().optional().nullable(),
  capacity_tons: z.number().min(0.1, { message: 'Tải trọng phải > 0' }).optional().nullable(),
  fuel_type: z.string().optional().nullable(),
  fuel_consumption_per_100km: z.number().min(0, { message: 'Định mức nhiên liệu (L/100km) phải >= 0' }).optional().nullable(),
  usage_limit_years: z.string().optional().nullable(),
  engine_number: z.string().min(5, { message: 'Bắt buộc nhập số máy' }),
  chassis_number: z.string().min(5, { message: 'Bắt buộc nhập số khung' }),
  insurance_purchase_date: z.string().optional().nullable(),
  insurance_expiry_date: z.string().optional().nullable(),
  insurance_civil_expiry: z.string().min(1, { message: 'Bắt buộc nhập hạn bảo hiểm dân sự' }),
  insurance_body_expiry: z.string().optional().nullable(),
  insurance_cost: z.number().optional().nullable(),
  registration_cycle: z.string().optional().nullable(),
  registration_date: z.string().optional().nullable(),
  registration_expiry_date: z.string().min(1, { message: 'Bắt buộc nhập hạn đăng kiểm' }),
  registration_cost: z.number().optional().nullable(),
  current_location: z.string().optional().nullable(),
  current_odometer: z.number().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  purchase_price: z.number().optional().nullable(),
  assignment_type: z.enum(['fixed', 'pool']).default('fixed'),
  status: z.enum(['active', 'maintenance', 'inactive', 'on_trip']).default('active'),
  notes: z.string().optional().nullable(),
}).passthrough().refine(data => {
  const idValue = data.id || data['Mã xe'] || data.vehicle_code;
  if (idValue && typeof idValue === 'string') {
    return /^(VEH-\d{4}-\d+|VEH\d{4}|XE\d{4}|XE\d{4}-\d+)$/.test(idValue);
  }
  return true;
}, { message: 'Mã xe sai định dạng chuẩn (VD: VEH-2604-01 hoặc XE0001)', path: ['vehicle_code'] });


export const DriverSchema = z.object({
  id: driverIdSchema.optional(),
  'Mã tài xế': driverIdSchema.optional(),
  driver_code: driverIdSchema.optional(),
  full_name: z.string().min(1, { message: 'Bắt buộc nhập họ tên' }),
  phone: z.string().regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, { message: 'Số điện thoại VN không hợp lệ' }),
  date_of_birth: z.string().optional().nullable(),
  tax_code: z.string().optional().nullable(),
  id_card: z.string().regex(/^[0-9]{9,12}$/, { message: 'Số CCCD/CMND phải là 9 hoặc 12 chữ số' }),
  id_issue_date: z.string().optional().nullable(),
  address: z.string().min(5, { message: 'Địa chỉ thường trú là bắt buộc' }),
  license_number: z.string().optional().nullable(),
  license_class: z.enum(['B2', 'C', 'D', 'E', 'FC', 'FE'], { required_error: 'Bắt buộc chọn hạng bằng lái' }),
  license_expiry: z.string().min(1, { message: 'Bắt buộc nhập hạn bằng lái' }),
  health_check_expiry: z.string().optional().nullable(),
  hire_date: z.string().optional().nullable(),
  contract_type: z.string().optional().nullable(),
  base_salary: z.number().optional().nullable(),
  status: z.string().default('active'),
  notes: z.string().optional().nullable(),
}).passthrough().refine(data => {
  const idValue = data.id || data['Mã tài xế'] || data.driver_code;
  if (idValue && typeof idValue === 'string') {
    return /^(DRV-\d{4}-\d+|DRV\d{4}|TX\d{4}|TX\d{4}-\d+)$/.test(idValue);
  }
  return true;
}, { message: 'Mã tài xế sai định dạng chuẩn (Bắt buộc DRV- hoặc TX + 4 số)', path: ['driver_code'] });

export const TripSchema = z.object({
  id: tripIdSchema.optional(),
  'Mã chuyến': tripIdSchema.optional(),
  trip_code: tripIdSchema.optional(),
  status: z.string().optional().default('draft'),
  vehicle_id: z.string().optional().nullable(),
  driver_id: z.string().optional().nullable(),
  customer_id: z.string().optional().nullable(),
  departure_date: z.string().optional().nullable(),
  arrival_date: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  start_odometer: z.number().min(0, { message: 'ODO đầu phải >= 0' }).optional().nullable(),
  end_odometer: z.number().min(0, { message: 'ODO cuối phải >= 0' }).optional().nullable(),
  cargo_weight_tons: z.number().min(0, { message: 'Khối lượng phải >= 0' }).optional().nullable(),
  freight_revenue: z.number().min(0, { message: 'Doanh thu phải >= 0' }).optional().nullable(),
  additional_charges: z.number().min(0, { message: 'Phí phát sinh phải >= 0' }).optional().nullable(),
  fuel_liters: z.number().min(0, { message: 'Số lít dầu phải >= 0' }).optional().nullable(),
  fuel_cost: z.number().min(0, { message: 'Tiền dầu phải >= 0' }).optional().nullable(),
  
  // Elite Logistics Logic
  pod_status: z.enum(['PENDING', 'RECEIVED', 'LOST']).default('PENDING'),
  pod_url: z.string().optional().nullable(),
  driver_advance: z.number().min(0, { message: 'Tiền tạm ứng phải >= 0' }).optional().default(0),
  actual_revenue: z.number().min(0, { message: 'Doanh thu thực tế phải >= 0' }).optional().nullable(),
  actual_distance_km: z.number().min(0).optional().nullable(),
  estimated_fuel_cost: z.number().min(0).optional().nullable(),
  estimated_driver_pay: z.number().min(0).optional().nullable(),
  adjustment_notes: z.string().optional().nullable(),
}).passthrough()
.refine(data => {
  const idValue = data.id || data['Mã chuyến'] || data.trip_code;
  if (idValue && typeof idValue === 'string') {
    // Accept: TRP-2604-01 (global standard), CD2604-01 (legacy monthly), CD00001 (legacy), LĐX- (driver self-draft)
    return /^(TRP-\d{4}-\d+|TRP\d{4}|CD\d{4}|CD\d{4}-\d+|LĐX-[\w\d-]+)$/.test(idValue);
  }
  return true;
}, { message: 'Mã chuyến không hợp lệ (VD: TRP-2604-01 hoặc CD0001)', path: ['trip_code'] })

.refine(data => {
  if (data.status !== 'draft' && data.status !== 'cancelled') {
    return !!data.vehicle_id && !!data.driver_id;
  }
  return true;
}, { message: 'Chuyến đang hoạt động bắt buộc phải gắn Xe và Tài xế', path: ['status'] })
.refine(data => {
  if (data.departure_date && data.arrival_date) {
    return new Date(data.departure_date) <= new Date(data.arrival_date);
  }
  return true;
}, { message: 'Ngày đến phải sau hoặc cùng ngày với ngày đi', path: ['arrival_date'] })
.refine(data => {
  if (typeof data.start_odometer === 'number' && typeof data.end_odometer === 'number') {
    return data.end_odometer >= data.start_odometer;
  }
  return true;
}, { message: 'ODO cuối không được nhỏ hơn ODO đầu', path: ['end_odometer'] })
.refine(data => {
  // KHÓA CỨNG: Hoàn thành/Đóng chuyến PHẢI có Doanh thu cước > 0
  if (data.status === 'completed' || data.status === 'closed') {
    return (data.freight_revenue ?? 0) > 0;
  }
  return true;
}, { message: 'Doanh thu cước (freight_revenue) phải > 0 khi hoàn thành chuyến', path: ['freight_revenue'] })
.refine(data => {
  // KHÓA CỨNG: Hoàn thành/Đóng bắt buộc tiền dầu > 0
  if (data.status === 'completed' || data.status === 'closed') {
    return (data.fuel_cost ?? 0) > 0;
  }
  return true;
}, { message: 'Tiền dầu (fuel_cost) phải > 0 — chuyến vận tải luôn tốn nhiên liệu', path: ['fuel_cost'] });

export const ExpenseSchema = z.object({
  expense_code: expenseIdSchema.optional(),
  expense_date: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  amount: amountSchema,
  description: z.string().optional().nullable(),
  trip_id: z.string().optional().nullable(),
  vehicle_id: z.string().optional().nullable(),
  driver_id: z.string().optional().nullable(),
  document_number: z.string().optional().nullable(),
  vendor_name: z.string().optional().nullable(),
  rejection_reason: z.string().optional().nullable(),
  status: z.enum(['draft', 'confirmed', 'cancelled', 'rejected']).default('draft'),
}).passthrough()
.refine(data => {
  return !!(data.trip_id || data.vehicle_id || data.driver_id || data.expense_date); // Relaxed for general expenses
}, { message: 'Phiếu chi phải hợp lệ', path: ['amount'] });

export const InventoryTransactionSchema = z.object({
    quantity: z.number().min(0, { message: 'Số lượng phải >= 0' }),
    unit_price: z.number().min(0, { message: 'Đơn giá phải >= 0' }),
}).passthrough();

// QA AUDIT FIX 3.1: Additional schemas for previously unvalidated collections
export const MaintenanceSchema = z.object({
  maintenance_code: maintenanceIdSchema.optional(),
  order_code: z.string().optional(),
  vehicle_id: z.string().min(1, { message: 'Phải chọn xe' }).optional(),
  maintenance_type: z.string().optional(),
  scheduled_date: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  labor_cost: z.number().optional().nullable(),
  parts_cost: z.number().optional().nullable(),
  total_cost: z.number().optional().nullable(),
  vendor_name: z.string().optional().nullable(),
  odometer_at_service: z.number().min(0).optional().nullable(),
  next_service_date: z.string().optional().nullable(),
  next_service_km: z.number().min(0).optional().nullable(),
  completed_at: z.string().optional().nullable(),
  cost: z.number().min(0).optional().nullable(),
  odometer: z.number().min(0).optional().nullable(),
}).passthrough();

export const RouteSchema = z.object({
  route_code: routeIdSchema.optional(),
  route_name: z.string().min(1, { message: 'Phải nhập tên tuyến đường' }),
  origin: z.string().min(1, { message: 'Bắt buộc nhập điểm đi' }).optional(),
  destination: z.string().min(1, { message: 'Bắt buộc nhập điểm đến' }).optional(),
  distance_km: z.number().min(0.1, { message: 'Khoảng cách phải > 0 km' }).optional(),
  estimated_duration_hours: z.number().optional().nullable(),
  cargo_type: z.string().optional().nullable(),
  cargo_weight_standard: z.number().optional().nullable(),
  base_price: z.number().min(0).optional().nullable(),
  transport_revenue_standard: z.number().optional().nullable(),
  driver_allowance_standard: z.number().optional().nullable(),
  support_fee_standard: z.number().optional().nullable(),
  police_fee_standard: z.number().optional().nullable(),
  fuel_liters_standard: z.number().optional().nullable(),
  fuel_cost_standard: z.number().optional().nullable(),
  tire_service_fee_standard: z.number().optional().nullable(),
  toll_cost: z.number().optional().nullable(),
  default_extra_fee: z.number().optional().nullable(),
  total_cost_standard: z.number().optional().nullable(),
  profit_standard: z.number().optional().nullable(),
  status: z.string().default('active'),
  notes: z.string().optional().nullable(),
}).passthrough();

export const CustomerSchema = z.object({
  customer_code: customerIdSchema.optional(),
  customer_name: z.string().min(1, { message: 'Phải nhập tên doanh nghiệp/khách hàng' }),
  customer_type: z.enum(['Doanh nghiệp', 'Cá nhân']).default('Doanh nghiệp'),
  tax_code: z.string().regex(/^[0-9]{10,13}$/, { message: 'Mã số thuế phải từ 10-13 chữ số' }).optional().nullable(),
  contact_person: z.string().optional().nullable(),
  phone: z.string().min(8, { message: 'Bắt buộc nhập SĐT liên hệ' }),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(5, { message: 'Bắt buộc nhập địa chỉ trụ sở' }),
  credit_limit: z.number().min(0, { message: 'Hạn mức tín dụng phải >= 0' }).optional(),
  payment_terms: z.number().optional().nullable(),
  short_name: z.string().optional().nullable(),
  status: z.string().default('active'),
  notes: z.string().optional().nullable(),
}).passthrough();

export const TransportOrderSchema = z.object({
  order_code: orderIdSchema.optional(),
  customer_id: z.string().min(1, { message: 'Phải chọn khách hàng' }),
  status: z.string(),
}).passthrough();

export const UserSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }),
  full_name: z.string().min(1, { message: 'Phải nhập tên đầy đủ' }),
  role: z.enum(['admin', 'manager', 'dispatcher', 'accountant', 'driver', 'viewer']).default('viewer'),
}).passthrough();

export const PurchaseOrderSchema = z.object({
  po_code: z.string().min(1, { message: 'Mã đơn mua là bắt buộc' }),
  order_date: z.string().min(1, { message: 'Ngày đặt hàng là bắt buộc' }),
  total_amount: z.number().min(0, { message: 'Tổng tiền phải >= 0' }),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
}).passthrough();

export const ExpenseCategorySchema = z.object({
  category_code: z.string().min(1, { message: 'Mã danh mục là bắt buộc' }),
  category_name: z.string().min(1, { message: 'Tên danh mục là bắt buộc' }),
}).passthrough();

export const AlertSchema = z.object({
  alert_type: z.enum(['warning', 'maintenance', 'expiry', 'error', 'info']).optional(),
  title: z.string().min(1, { message: 'Tiêu đề cảnh báo là bắt buộc' }),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
}).passthrough();

export const CompanySettingsSchema = z.object({
  company_name: z.string().min(1, { message: 'Tên công ty là bắt buộc' }).optional(),
  subscription: z.object({
    plan: z.enum(['trial', 'professional', 'business', 'enterprise']).optional(),
    status: z.string().optional(),
  }).optional(),
}).passthrough();

export const PartnerSchema = z.object({
  name: z.string().min(1, { message: 'Tên đối tác là bắt buộc' }).optional(),
  partner_name: z.string().min(1, { message: 'Tên đối tác là bắt buộc' }).optional(),
}).passthrough();

// Factory object to select schema by collection Name
export const CollectionSchemas: Record<string, z.ZodTypeAny> = {
  vehicles: VehicleSchema,
  drivers: DriverSchema,
  trips: TripSchema,
  expenses: ExpenseSchema,
  inventoryTransactions: InventoryTransactionSchema,
  maintenance: MaintenanceSchema,
  routes: RouteSchema,
  customers: CustomerSchema,
  transportOrders: TransportOrderSchema,
  users: UserSchema,
  purchaseOrders: PurchaseOrderSchema,
  expenseCategories: ExpenseCategorySchema,
  alerts: AlertSchema,
  companySettings: CompanySettingsSchema,
  company_settings: CompanySettingsSchema,
  partners: PartnerSchema,
};

// Validate generic function to use inside adapter
export const validateAdapterData = (collectionName: string, data: any) => {
  const schema = CollectionSchemas[collectionName];
  if (!schema) return data; // No validation enforced
  
  const result = schema.safeParse(data);
  if (!result.success) {
     const errorMessages = result.error.errors.map(err => err.message).join(', ');
     throw new Error(`Lỗi dữ liệu: ${errorMessages}`);
  }
  return result.data;
};
