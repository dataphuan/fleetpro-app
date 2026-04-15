/**
 * FleetPro Application Constants
 * Centralized configuration values to avoid magic numbers scattered in code.
 */

// ==================== SaaS Plan Limits ====================
export const PLAN_LIMITS = {
    trial: { vehicles: 50, drivers: 50, trips_per_month: 200 },
    professional: { vehicles: 100, drivers: 100, trips_per_month: 2000 },
    enterprise: { vehicles: Infinity, drivers: Infinity, trips_per_month: Infinity },
} as const;

// ==================== Trial Configuration ====================
export const TRIAL_DURATION_DAYS = 14;

// ==================== Internal Tenant Whitelist ====================
// Only these tenant IDs get automatic enterprise plan bypass
export const INTERNAL_TENANT_WHITELIST = new Set([
    'internal-tenant-1',
    'internal-tenant-phuan',
]);

// ==================== Session & Throttle ====================
export const IDLE_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const MUTATION_THROTTLE_WINDOW_MS = 800;

// ==================== Vehicle Defaults ====================
export const DEFAULT_VEHICLE_LOCATION = 'Bãi xe TP.HCM';
export const DEFAULT_REGISTRATION_COST = 350_000; // VND

// ==================== Route Cost Defaults (VND) ====================
export const DEFAULT_ROUTE_COSTS = {
    police_fee: 120_000,
    tire_service_fee: 80_000,
    other_fee: 100_000,
    driver_allowance_rate: 0.08, // 8% of transport revenue
    support_fee_rate: 0.03, // 3% of transport revenue
} as const;

// ==================== GPS Tracking ====================
export const GPS_TRACKING = {
    min_checkin_accuracy_m: 50,
    max_tracking_accuracy_m: 120,
    tracking_push_interval_ms: 12_000,
    trip_last_location_sync_ms: 60_000,
} as const;

// ==================== Firebase Collection Names ====================
export const COLLECTIONS = {
    users: 'users',
    vehicles: 'vehicles',
    drivers: 'drivers',
    trips: 'trips',
    routes: 'routes',
    customers: 'customers',
    expenses: 'expenses',
    maintenance: 'maintenance',
    transportOrders: 'transportOrders',
    expenseCategories: 'expenseCategories',
    alerts: 'alerts',
    systemLogs: 'system_logs',
    companySettings: 'company_settings',
    counters: 'counters',
    tripLocationLogs: 'trip_location_logs',
} as const;

// ==================== ID Prefixes ====================
export const ID_PREFIXES: Record<string, { prefix: string; padding: number }> = {
    vehicles: { prefix: 'XE', padding: 4 },
    drivers: { prefix: 'TX', padding: 4 },
    customers: { prefix: 'KH', padding: 4 },
    trips: { prefix: 'CD', padding: 4 },
    routes: { prefix: 'TD', padding: 4 },
    transportOrders: { prefix: 'DH', padding: 4 },
    expenses: { prefix: 'PC', padding: 4 },
    maintenance: { prefix: 'BD', padding: 4 },
};

// ==================== Default Company Settings ====================
export const DEFAULT_COMPANY_SETTINGS = {
    company_name: 'Công ty của tôi',
    primary_color: '#3b82f6', // Blue
    subscription: {
        plan: 'business' as const,
        status: 'active' as const,
    },
};
