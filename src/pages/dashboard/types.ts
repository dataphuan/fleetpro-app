export interface DashboardRevenueRow {
  id: string;
  trip_code: string;
  trip_date: string;
  customer_name: string;
  route_name: string;
  vehicle_plate: string;
  revenue: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
  status: 'completed' | 'draft' | 'cancelled' | 'in_progress' | 'assigned';
}

export interface DashboardExpenseRow {
  id: string;
  expense_code: string;
  expense_date: string;
  category_name: string;
  vehicle_plate: string | null;
  trip_code: string | null;
  amount: number;
  vendor_name: string | null;
  status: 'draft' | 'confirmed' | 'cancelled';
}

export interface DashboardTripRow {
  id: string;
  trip_code: string;
  departure_date: string;
  vehicle_plate: string;
  driver_name: string;
  route_name: string;
  customer_name: string;
  status: 'draft' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  revenue: number;
  profit: number;
}

export interface DashboardFleetPerformanceRow {
  id: string; // Required for DataTable
  vehicle_id: string;
  vehicle_plate: string;
  vehicle_type: string;
  total_trips: number;
  total_km: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  fuel_efficiency: number; // km/liter
  avg_profit_per_trip: number;
  utilization_rate: number; // %
}

export interface DashboardAlertRow {
  id: string;
  alert_type: 'maintenance' | 'license' | 'insurance' | 'debt' | 'performance';
  severity: 'high' | 'medium' | 'low';
  entity_type: 'vehicle' | 'driver' | 'customer' | 'trip';
  entity_name: string;
  message: string;
  created_at: string;
  link_to?: string;
}

export type DashboardTab = 'overview' | 'revenue' | 'expenses' | 'trips' | 'fleet' | 'alerts';
