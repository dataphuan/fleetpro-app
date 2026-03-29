
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';

// Connect to the ACTIVE database used by the app
const DB_PATH = path.resolve(__dirname, '../../../offline-db/data.sqlite');
let db;

describe('App CRUD Logic Verification', () => {
    beforeAll(() => {
        db = new Database(DB_PATH);
    });

    afterAll(() => {
        if (db) db.close();
    });

    // --- 1. VEHICLE INPUT LOGIC ---
    describe('Vehicles Tab Logic', () => {
        const testCode = 'TEST-VEH-' + Date.now();
        let vehicleId: string;

        it('should allow Creating a new vehicle with valid inputs', () => {
            vehicleId = `veh_p_${Date.now()}`;
            const stmt = db.prepare(`
                INSERT INTO vehicles (id, vehicle_code, license_plate, vehicle_type, status)
                VALUES (?, ?, ?, ?, ?)
            `);

            const info = stmt.run(vehicleId, testCode, '99A-TEST', 'Xe Tải', 'active');
            expect(info.changes).toBe(1);
        });

        it('should READ the created vehicle correctly', () => {
            const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
            expect(row).toBeDefined();
            expect(row.vehicle_code).toBe(testCode);
            expect(row.license_plate).toBe('99A-TEST');
        });

        it('should allow UPDATE and reflect changes', () => {
            const updateStmt = db.prepare(`
                UPDATE vehicles SET status = 'maintenance', brand = 'UPDATED-BRAND'
                WHERE id = ?
            `);
            updateStmt.run(vehicleId);

            const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
            expect(row.status).toBe('maintenance');
            expect(row.brand).toBe('UPDATED-BRAND');
        });

        it('should validate DELETE logic (Soft Delete or Hard Delete)', () => {
            db.prepare('DELETE FROM vehicles WHERE id = ?').run(vehicleId);
            const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
            expect(row).toBeUndefined();
        });
    });

    // --- 2. CUSTOMER INPUT LOGIC --- 
    describe('Customers Tab Logic', () => {
        const custCode = 'CUST-TEST-' + Date.now();
        let custId: string;

        it('should Create customer with Credit Limit logic', () => {
            custId = `cust_p_${Date.now()}`;
            db.prepare(`
                INSERT INTO customers (id, customer_code, customer_name, credit_limit, status_label)
                VALUES (?, ?, ?, ?, ?)
            `).run(custId, custCode, 'Test Company', 50000000, 'active');

            const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(custId);
            expect(row.credit_limit).toBe(50000000);
        });

        it('should verify Credit Limit updates', () => {
            db.prepare('UPDATE customers SET credit_limit = 60000000 WHERE id = ?').run(custId);

            const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(custId);
            expect(row.credit_limit).toBe(60000000);
        });

        it('cleanup customer', () => {
            db.prepare('DELETE FROM customers WHERE id = ?').run(custId);
        });
    });

    // --- 3. EXPENSES INPUT LOGIC ---
    describe('Expenses Tab Logic', () => {
        let expenseId: string;

        it('should Create Expense linked to Vehicle', () => {
            const vehicle = db.prepare('SELECT id FROM vehicles LIMIT 1').get();
            if (!vehicle) return; // Skip if no vehicles

            const category = db.prepare("SELECT id FROM expense_categories WHERE category_code='FUEL'").get();
            if (!category) return;

            expenseId = `exp_p_${Date.now()}`;
            db.prepare(`
                INSERT INTO expenses (id, expense_code, amount, vehicle_id, category_id, expense_date, description, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(expenseId, 'EXP-TEST', 500000, vehicle.id, category.id, '2024-02-01', 'Test Description', 'confirmed');

            const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
            expect(row.amount).toBe(500000);
            expect(row.vehicle_id).toBe(vehicle.id);
        });

        it('should allow Create Unlinked Expense (Overhead)', () => {
            const unlinkedId = `exp_u_${Date.now()}`;
            const category = db.prepare("SELECT id FROM expense_categories WHERE category_code='OTHER'").get();
            if (!category) return;

            db.prepare(`
                INSERT INTO expenses (id, expense_code, amount, category_id, expense_date, description, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(unlinkedId, 'EXP-OVERHEAD', 100000, category.id, '2024-02-01', 'Overhead Desc', 'confirmed');

            const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(unlinkedId);
            expect(row.vehicle_id).toBeNull();
            expect(row.trip_id).toBeNull();

            db.prepare('DELETE FROM expenses WHERE id = ?').run(unlinkedId);
        });

        it('cleanup linked expense', () => {
            if (expenseId) {
                db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);
            }
        });
    });
});
