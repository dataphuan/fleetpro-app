import { z } from 'zod';

// ID formats
export const vehicleIdSchema = z.string().regex(/^XE\d{4}$/, { message: 'Mã xe phải bắt đầu bằng XE và 4 số (VD: XE0001)' });
export const driverIdSchema = z.string().regex(/^TX\d{4}$/, { message: 'Mã tài xế phải đúng chuẩn TX kèm 4 số (VD: TX0001)' });
export const tripIdSchema = z.string().regex(/^(CD\d{4}|LĐX-[\w-]+)$/, { message: 'Mã chuyến đi không đúng định dạng (VD: CD0001 hoặc LĐX-xxx)' });
export const routeIdSchema = z.string().regex(/^TD\d{4}$/, { message: 'Mã tuyến đường phải bắt đầu bằng TD và 4 số (VD: TD0001)' });
export const customerIdSchema = z.string().regex(/^KH\d{4}$/, { message: 'Mã khách hàng phải bắt đầu bằng KH và 4 số (VD: KH0001)' });
export const orderIdSchema = z.string().regex(/^DH\d{4}$/, { message: 'Mã đơn hàng phải bắt đầu bằng DH và 4 số (VD: DH0001)' });
export const expenseIdSchema = z.string().regex(/^PC\d{4}$/, { message: 'Mã phiếu chi phải bắt đầu bằng PC và 4 số (VD: PC0001)' });
export const maintenanceIdSchema = z.string().regex(/^BD\d{4}$/, { message: 'Mã bảo dưỡng phải bắt đầu bằng BD và 4 số (VD: BD0001)' });

// Absolute Financial Sanity
export const amountSchema = z.number().min(0, { message: 'Số tiền/Chi phí phải lớn hơn hoặc bằng 0' });

// Full Schemas (Partial definitions mapped to what's going to firestore)
export const VehicleSchema = z.object({
  id: vehicleIdSchema.optional(),
  'Mã xe': vehicleIdSchema.optional(),
  vehicle_type: z.string().min(1, { message: 'Bắt buộc nhập loại xe' }),
  license_plate: z.string().min(1, { message: 'Bắt buộc nhập biển số' }),
  payload_capacity: z.number().min(0, { message: 'Tải trọng phải >= 0' }).optional(),
  insurance_expiry: z.string().optional().nullable(),
  registration_expiry: z.string().optional().nullable(),
  assignment_type: z.enum(['fixed', 'pool']).default('fixed'),
}).passthrough().refine(data => {
  const idValue = data.id || data['Mã xe'];
  if (idValue && typeof idValue === 'string') {
    return /^XE\d{4}$/.test(idValue);
  }
  return true;
}, { message: 'Mã xe sai định dạng chuẩn (Bắt buộc XE + 4 số, VD: XE0001)', path: ['id'] });

export const DriverSchema = z.object({
  id: driverIdSchema.optional(),
  'Mã tài xế': driverIdSchema.optional(),
  driver_code: driverIdSchema.optional(),
  full_name: z.string().min(1, { message: 'Bắt buộc nhập họ tên' }),
  phone: z.string().min(8, { message: 'Bắt buộc nhập số điện thoại hợp lệ' }),
  id_card_number: z.string().min(9, { message: 'Bắt buộc nhập số CCCD/CMND (9-12 số)' }).optional(),
  license_class: z.string().min(1, { message: 'Bắt buộc nhập hạng bằng lái (B2/C/D/E/FC)' }).optional(),
  license_expiry: z.string().min(1, { message: 'Bắt buộc nhập hạn bằng lái' }).optional(),
  health_check_expiry: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
}).passthrough().refine(data => {
  const idValue = data.id || data['Mã tài xế'] || data.driver_code;
  if (idValue && typeof idValue === 'string') {
    return /^TX\d{4}$/.test(idValue);
  }
  return true;
}, { message: 'Mã tài xế sai định dạng chuẩn (Bắt buộc TX + 4 số)', path: ['driver_code'] });

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
  adjustment_notes: z.string().optional().nullable(),
}).passthrough()
.refine(data => {
  const idValue = data.id || data['Mã chuyến'] || data.trip_code;
  if (idValue && typeof idValue === 'string') {
    return /^(CD\d{4}|LĐX-[\w-]+)$/.test(idValue);
  }
  return true;
}, { message: 'Mã chuyến đi không hợp lệ (Bắt buộc CD + 4 số, VD: CD0001)', path: ['id'] })
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
  amount: amountSchema,
  trip_id: z.string().optional().nullable(),
  vehicle_id: z.string().optional().nullable(),
  driver_id: z.string().optional().nullable(),
  status: z.enum(['draft', 'confirmed', 'cancelled', 'rejected']).default('draft'),
}).passthrough()
.refine(data => {
  return !!(data.trip_id || data.vehicle_id || data.driver_id);
}, { message: 'Phiếu chi không được mồ côi (Gắn ít nhất 1 Đối tượng)', path: ['amount'] });

export const InventoryTransactionSchema = z.object({
    quantity: z.number().min(0, { message: 'Số lượng phải >= 0' }),
    unit_price: z.number().min(0, { message: 'Đơn giá phải >= 0' }),
}).passthrough();

// QA AUDIT FIX 3.1: Additional schemas for previously unvalidated collections
export const MaintenanceSchema = z.object({
  maintenance_code: maintenanceIdSchema.optional(),
  vehicle_id: z.string().min(1, { message: 'Phải chọn xe' }),
  cost: z.number().min(0, { message: 'Chi phí bảo trì phải >= 0' }),
  odometer: z.number().min(0, { message: 'Chỉ số ODO phải >= 0' }).optional(),
}).passthrough();

export const RouteSchema = z.object({
  route_code: routeIdSchema.optional(),
  route_name: z.string().min(1, { message: 'Phải nhập tên tuyến đường' }),
  origin: z.string().min(1, { message: 'Bắt buộc nhập điểm đi' }).optional(),
  destination: z.string().min(1, { message: 'Bắt buộc nhập điểm đến' }).optional(),
  distance_km: z.number().min(0.1, { message: 'Khoảng cách phải > 0 km' }).optional(),
  standard_freight_rate: z.number().min(1, { message: 'Cước chuẩn phải > 0 VND' }).optional(),
}).passthrough();

export const CustomerSchema = z.object({
  customer_code: customerIdSchema.optional(),
  customer_name: z.string().min(1, { message: 'Phải nhập tên khách hàng' }),
  contact_phone: z.string().min(8, { message: 'Bắt buộc nhập SĐT liên hệ' }).optional(),
  address: z.string().min(1, { message: 'Bắt buộc nhập địa chỉ' }).optional(),
  tax_code: z.string().optional().nullable(),
  credit_limit: z.number().min(0, { message: 'Hạn mức tín dụng phải >= 0' }).optional(),
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
