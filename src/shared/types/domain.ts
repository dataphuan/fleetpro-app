/**
 * Domain Types - Used across offline-db and UI
 */

export type UserRole = 'admin' | 'manager' | 'dispatcher' | 'accountant' | 'driver' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'locked';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  vehicle_code: string;
  license_plate: string;
  vehicle_type: string;
  brand?: string;
  model?: string;
  year_manufactured?: number;
  capacity_tons?: number;
  capacity_cbm?: number;
  fuel_type: string;
  fuel_consumption_per_100km?: number;
  current_odometer: number;
  engine_number?: string;
  chassis_number?: string;
  usage_limit_years?: string;
  insurance_purchase_date?: string;
  insurance_expiry_date?: string;
  insurance_cost?: number;
  registration_cycle?: string;
  registration_date?: string;
  registration_expiry_date?: string;
  registration_cost?: number;
  current_location?: string;
  status: 'active' | 'maintenance' | 'inactive';
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  driver_code: string;
  full_name: string;
  phone?: string;
  id_card?: string;
  license_number?: string;
  license_class?: string;
  license_expiry?: string;
  address?: string;
  date_of_birth?: string;
  hire_date?: string;
  base_salary: number;
  status: 'active' | 'on_leave' | 'inactive';
  assigned_vehicle_id?: string;
  notes?: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface Route {
  id: string;
  route_code: string;
  route_name: string;
  origin: string;
  destination: string;
  distance_km?: number;
  estimated_duration_hours?: number;
  toll_cost?: number;
  standard_freight_rate?: number;
  notes?: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  customer_type?: 'business' | 'individual';
  short_name?: string;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  contact_phone?: string;
  payment_terms?: number;
  credit_limit?: number;
  notes?: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  trip_code: string;
  vehicle_id: string;
  driver_id: string;
  route_id?: string;
  customer_id?: string;
  departure_date: string;
  planned_arrival_date?: string;
  actual_departure_time?: string;
  actual_arrival_time?: string;
  start_odometer?: number;
  end_odometer?: number;
  actual_distance_km?: number;
  cargo_description?: string;
  cargo_weight_tons?: number;
  cargo_cbm?: number;
  freight_revenue?: number;
  additional_charges?: number;
  total_revenue?: number;
  status: 'draft' | 'pending' | 'confirmed' | 'dispatched' | 'in_progress' | 'completed' | 'closed' | 'cancelled';

  // Elite Logistics Logic
  pod_status?: 'PENDING' | 'RECEIVED' | 'LOST';
  pod_url?: string;
  driver_advance?: number;
  actual_revenue?: number;
  adjustment_notes?: string;

  // Audit fields
  confirmed_at?: string;
  confirmed_by?: string;
  accepted_at?: string;
  accepted_by?: string;
  closed_at?: string;
  closed_by?: string;
  cancelled_at?: string;
  dispatched_at?: string;
  dispatched_by?: string;

  notes?: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  category_code: string;
  category_name: string;
  category_type: string;
  is_trip_related: number;
  is_vehicle_related: number;
  notes?: string;
  is_deleted: number;
  created_at: string;
}

export interface Expense {
  id: string;
  expense_code: string;
  expense_date: string;
  category_id: string;
  trip_id?: string;
  vehicle_id?: string;
  driver_id?: string;
  description: string;
  amount: number;
  quantity?: number;
  unit_price?: number;
  document_number?: string;
  document_date?: string;
  vendor_name?: string;
  status: 'draft' | 'confirmed' | 'cancelled' | 'rejected';
  rejection_reason?: string;
  confirmed_at?: string;
  confirmed_by?: string;
  notes?: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseAllocation {
  id: string;
  expense_id: string;
  trip_id: string;
  allocated_amount: number;
  allocation_percentage?: number;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  cost: number;
  currency: string;
  maintenance_date: string;
  odometer?: number;
  notes?: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface FuelRecord {
  id: string;
  vehicle_id: string;
  trip_id?: string;
  fuel_liters: number;
  cost_per_liter: number;
  total_cost: number;
  currency: string;
  fuel_date: string;
  odometer?: number;
  notes?: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface RevenueRecord {
  id: string;
  trip_id: string;
  customer_id?: string;
  amount: number;
  currency: string;
  revenue_date: string;
  notes?: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  alert_type: 'warning' | 'maintenance' | 'expiry' | 'error' | 'info';
  title: string;
  message?: string;
  reference_id?: string;
  reference_type?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_read: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: string;
  new_values?: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  item_code: string;
  name: string;
  category: string;
  unit: string;
  min_stock_level: number;
  current_stock: number;
  average_cost: number;
  total_value: number;
  location?: string;
  notes?: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface Tire {
  id: string;
  item_id: string;
  serial_number: string;
  brand?: string;
  size?: string;
  current_status: 'IN_STOCK' | 'INSTALLED' | 'AT_REPAIR' | 'SCRAPPED';
  current_vehicle_id?: string;
  installed_position?: string;
  total_km_run: number;
  purchase_date?: string;
  notes?: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_code: string;
  vendor_name?: string;
  order_date: string;
  expected_date?: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  transaction_code: string;
  transaction_date: string;
  type: 'IN_NEW' | 'IN_RETURN' | 'OUT_INSTALL' | 'OUT_REPAIR' | 'OUT_SCRAP' | 'ADJUSTMENT';
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  reference_id?: string;
  notes?: string;
  is_deleted: number;
  created_at: string;
}
