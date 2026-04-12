import { z } from 'zod';

// ID formats
export const vehicleIdSchema = z.string().startsWith('XE', { message: 'Mã xe phải bắt đầu bằng XE (VD: XE001)' });
export const driverIdSchema = z.string().regex(/^TX-\d+$/, { message: 'Mã tài xế phải đúng chuẩn TX- kèm số (VD: TX-01, TX-15)' });
export const tripIdSchema = z.string().startsWith('TD', { message: 'Mã chuyến đi phải bắt đầu bằng TD (VD: TD001)' });

// Absolute Financial Sanity
export const amountSchema = z.number().min(0, { message: 'Số tiền/Chi phí phải lớn hơn hoặc bằng 0' });

// Full Schemas (Partial definitions mapped to what's going to firestore)
export const VehicleSchema = z.object({
  id: vehicleIdSchema.optional(),
  'Mã xe': vehicleIdSchema.optional(),
}).passthrough().refine(data => {
  const idValue = data.id || data['Mã xe'];
  if (idValue && typeof idValue === 'string') {
    return idValue.startsWith('XE');
  }
  return true; // allow empty if not provided, though it shouldn't happen usually
}, { message: 'Mã xe không hợp lệ (Phải bắt đầu bằng XE)', path: ['id'] });

export const DriverSchema = z.object({
  id: driverIdSchema.optional(),
  'Mã tài xế': driverIdSchema.optional(),
  driver_code: driverIdSchema.optional(),
}).passthrough().refine(data => {
  const idValue = data.id || data['Mã tài xế'] || data.driver_code;
  if (idValue && typeof idValue === 'string') {
    return /^TX-\d+$/.test(idValue);
  }
  return true;
}, { message: 'Mã tài xế sai định dạng chuẩn (Bắt buộc TX-xx)', path: ['driver_code'] });

export const TripSchema = z.object({
  id: tripIdSchema.optional(),
  'Mã chuyến': tripIdSchema.optional(),
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
  const idValue = data.id || data['Mã chuyến'];
  if (idValue && typeof idValue === 'string') {
    return idValue.startsWith('TD');
  }
  return true;
}, { message: 'Mã chuyến đi không hợp lệ (Phải bắt đầu bằng TD)', path: ['id'] })
.refine(data => {
  if (data.status !== 'draft' && data.status !== 'cancelled') {
    return !!data.vehicle_id && !!data.driver_id;
  }
  return true;
}, { message: 'Chuyến đang hoạt động bắt buộc phải gắn Xe và Tài xế', path: ['status'] })
.refine(data => {
  if ((data.freight_revenue && data.freight_revenue > 0)) {
    return !!data.customer_id;
  }
  return true;
}, { message: 'Chuyến có doanh thu bắt buộc phải gắn Khách hàng', path: ['customer_id'] })
.refine(data => {
  if (data.created_at && data.departure_date) {
    return new Date(data.created_at) <= new Date(data.departure_date);
  }
  return true;
}, { message: 'Ngày tạo hệ thống không được sau ngày xuất phát dự kiến', path: ['departure_date'] })
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
  if (data.status === 'completed') {
    return data.start_odometer !== undefined && data.start_odometer !== null && data.end_odometer !== undefined && data.end_odometer !== null;
  }
  return true;
}, { message: 'Bắt buộc nhập ODO đầu và cuối trước khi chốt Hoàn Thành chuyến đi', path: ['end_odometer'] });

export const ExpenseSchema = z.object({
  amount: amountSchema.optional(),
  'Số tiền': amountSchema.optional(),
  category: z.string().optional(),
  trip_id: z.string().optional().nullable(),
  vehicle_id: z.string().optional().nullable(),
  driver_id: z.string().optional().nullable(),
  order_code: z.string().optional().nullable(),
  payment_method: z.enum(['CASH', 'ETC', 'BANK_TRANSFER']).default('CASH'),
  odometer_reading: z.number().min(0, { message: 'Chỉ số ODO phải >= 0' }).optional(),
  is_reconciled: z.boolean().default(false),
  reconciliation_date: z.string().optional().nullable(),
  status: z.enum(['draft', 'confirmed', 'cancelled', 'rejected']).default('draft'),
  rejection_reason: z.string().optional().nullable(),
}).passthrough()
.refine(data => {
  return !!(data.trip_id || data.vehicle_id || data.driver_id || data.order_code);
}, { message: 'Phiếu chi không được mồ côi (Gắn ít nhất 1 Đối tượng)', path: ['amount'] });

export const InventoryTransactionSchema = z.object({
    quantity: z.number().min(0, { message: 'Số lượng phải >= 0' }),
    unit_price: z.number().min(0, { message: 'Đơn giá phải >= 0' }),
}).passthrough();

// QA AUDIT FIX 3.1: Additional schemas for previously unvalidated collections
export const MaintenanceSchema = z.object({
  vehicle_id: z.string().min(1, { message: 'Phải chọn xe' }),
  maintenance_type: z.string().min(1, { message: 'Phải chọn loại bảo trì' }),
  cost: z.number().min(0, { message: 'Chi phí bảo trì phải >= 0' }),
  maintenance_date: z.string().min(1, { message: 'Phải nhập ngày bảo trì' }),
  odometer: z.number().min(0, { message: 'Chỉ số ODO phải >= 0' }).optional(),
}).passthrough();

export const RouteSchema = z.object({
  route_name: z.string().min(1, { message: 'Phải nhập tên tuyến đường' }),
  origin: z.string().min(1, { message: 'Phải nhập điểm đi' }),
  destination: z.string().min(1, { message: 'Phải nhập điểm đến' }),
  distance_km: z.number().min(0, { message: 'Khoảng cách phải >= 0' }).optional(),
  toll_cost: z.number().min(0, { message: 'Phí cầu đường phải >= 0' }).optional(),
  standard_freight_rate: z.number().min(0, { message: 'Cước chuẩn phải >= 0' }).optional(),
}).passthrough()
.refine(data => {
  if (data.origin && data.destination) {
    return data.origin.trim().toLowerCase() !== data.destination.trim().toLowerCase();
  }
  return true;
}, { message: 'Điểm đến không được trùng với điểm xuất phát', path: ['destination'] });

export const CustomerSchema = z.object({
  customer_name: z.string().min(1, { message: 'Phải nhập tên khách hàng' }),
  credit_limit: z.number().min(0, { message: 'Hạn mức tín dụng phải >= 0' }).optional(),
  payment_terms: z.number().min(0, { message: 'Số ngày thanh toán phải >= 0' }).optional(),
}).passthrough();

export const TransportOrderSchema = z.object({
  order_code: z.string().optional(),
  customer_id: z.string().optional(),
  status: z.enum(['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).default('draft'),
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
    plan: z.enum(['trial', 'professional', 'enterprise']).optional(),
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
