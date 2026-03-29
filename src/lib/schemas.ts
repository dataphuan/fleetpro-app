import { z } from 'zod';

// ID formats
export const vehicleIdSchema = z.string().startsWith('XE', { message: 'Mã xe phải bắt đầu bằng XE (VD: XE001)' });
export const driverIdSchema = z.string().startsWith('TX', { message: 'Mã tài xế phải bắt đầu bằng TX (VD: TX001)' });
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
}).passthrough().refine(data => {
  const idValue = data.id || data['Mã tài xế'];
  if (idValue && typeof idValue === 'string') {
    return idValue.startsWith('TX');
  }
  return true;
}, { message: 'Mã tài xế không hợp lệ (Phải bắt đầu bằng TX)', path: ['id'] });

export const TripSchema = z.object({
  id: tripIdSchema.optional(),
  'Mã chuyến': tripIdSchema.optional(),
  departure_date: z.string().optional().nullable(),
  arrival_date: z.string().optional().nullable(), 
}).passthrough()
.refine(data => {
  const idValue = data.id || data['Mã chuyến'];
  if (idValue && typeof idValue === 'string') {
    return idValue.startsWith('TD');
  }
  return true;
}, { message: 'Mã chuyến đi không hợp lệ (Phải bắt đầu bằng TD)', path: ['id'] })
.refine(data => {
  if (data.departure_date && data.arrival_date) {
    return new Date(data.departure_date) <= new Date(data.arrival_date);
  }
  return true;
}, {
  message: 'Ngày đến phải sau hoặc cùng ngày với ngày đi',
  path: ['arrival_date'],
});

export const ExpenseSchema = z.object({
  amount: amountSchema.optional(),
  'Số tiền': amountSchema.optional(),
}).passthrough();

// Factory object to select schema by collection Name
export const CollectionSchemas: Record<string, z.ZodTypeAny> = {
  vehicles: VehicleSchema,
  drivers: DriverSchema,
  trips: TripSchema,
  expenses: ExpenseSchema,
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
