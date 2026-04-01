#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const seedPath = path.join(root, 'src', 'data', 'tenantDemoSeed.ts');

const src = fs.readFileSync(seedPath, 'utf8');
const m = src.match(/export const TENANT_DEMO_SEED = ([\s\S]*?) as const;/);
if (!m) {
  console.error('FAIL: Cannot parse TENANT_DEMO_SEED payload');
  process.exit(1);
}

const payload = JSON.parse(m[1]);
const c = payload.collections || {};

const required = {
  vehicles: [
    'vehicle_code', 'license_plate', 'vehicle_type', 'engine_number', 'chassis_number',
    'insurance_purchase_date', 'insurance_civil_expiry', 'insurance_body_expiry',
    'registration_cycle', 'registration_date', 'registration_expiry_date', 'current_location', 'status'
  ],
  drivers: [
    'driver_code', 'full_name', 'phone', 'date_of_birth', 'tax_code', 'id_card',
    'id_issue_date', 'license_number', 'license_class', 'license_issue_date',
    'license_expiry', 'hire_date', 'contract_type', 'assigned_vehicle_id', 'status'
  ],
  routes: [
    'route_code', 'route_name', 'origin', 'destination', 'distance_km', 'estimated_duration_hours',
    'cargo_type', 'cargo_weight_standard', 'base_price', 'transport_revenue_standard',
    'driver_allowance_standard', 'support_fee_standard', 'police_fee_standard', 'fuel_liters_standard',
    'fuel_cost_standard', 'tire_service_fee_standard', 'toll_cost', 'default_extra_fee',
    'total_cost_standard', 'profit_standard', 'status'
  ],
  transportOrders: [
    'order_code', 'customer_id', 'order_value', 'order_date', 'expected_delivery_date', 'delivery_date', 'status'
  ],
  expenses: [
    'expense_code', 'expense_date', 'category_id', 'description', 'amount', 'status', 'vehicle_id', 'trip_id'
  ],
};

const isMissing = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

let failCount = 0;
let passCount = 0;

for (const [collectionName, fields] of Object.entries(required)) {
  const rows = c[collectionName] || [];

  if (!rows.length) {
    console.log(`FAIL: ${collectionName} has no rows`);
    failCount += 1;
    continue;
  }

  for (const field of fields) {
    const missing = rows.filter((r) => isMissing(r[field]));
    if (missing.length > 0) {
      console.log(`FAIL: ${collectionName}.${field} missing ${missing.length}/${rows.length}`);
      failCount += 1;
    } else {
      passCount += 1;
    }
  }
}

console.log('\nDEMO DATA COVERAGE AUDIT');
console.log('========================');
console.log(`PASS checks: ${passCount}`);
console.log(`FAIL checks: ${failCount}`);
console.log(`RESULT: ${failCount === 0 ? 'PASS' : 'FAIL'}`);

process.exit(failCount === 0 ? 0 : 1);
