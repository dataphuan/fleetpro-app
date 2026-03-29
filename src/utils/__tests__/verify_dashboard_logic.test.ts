
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve(__dirname, '../../../offline-db/data.sqlite');
let db;

describe('Dashboard Logic Verification', () => {
    beforeAll(() => {
        db = new Database(DB_PATH);
    });

    afterAll(() => {
        if (db) db.close();
    });

    it('should calculate Dashboard Stats (Revenue, Profit, Counts)', () => {
        const stats = db.prepare(`
            SELECT 
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as count_completed,
                SUM(CASE WHEN t.status = 'completed' THEN t.total_revenue ELSE 0 END) as rev_completed,
                SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as count_progress,
                SUM(CASE WHEN t.status = 'in_progress' THEN t.total_revenue ELSE 0 END) as rev_progress
            FROM trips t
            WHERE t.is_deleted = 0
        `).get();

        const tripExpResult = db.prepare(`
            SELECT SUM(e.amount) as total
            FROM expenses e
            JOIN trips t ON e.trip_id = t.id
            WHERE t.status = 'completed' AND t.is_deleted = 0
        `).get();

        console.log('--- DASHBOARD STATS ---');
        console.log('Completed Trips:', stats?.count_completed || 0);
        console.log('Completed Revenue:', stats?.rev_completed || 0);
        console.log('Completed Expense:', tripExpResult?.total || 0);
        console.log('In Progress Trips:', stats?.count_progress || 0);

        const totalExp = db.prepare('SELECT SUM(amount) as total FROM expenses WHERE is_deleted = 0').get()?.total || 0;
        console.log('Total Expenses (All):', totalExp);

        expect(stats?.rev_completed || 0).toBeGreaterThanOrEqual(0);
        expect(totalExp).toBeGreaterThanOrEqual(0);
    });

    it('should generate Expense Breakdown', () => {
        const breakdown = db.prepare(`
            SELECT ec.category_name, SUM(e.amount) as value, COUNT(e.id) as count
            FROM expenses e
            JOIN expense_categories ec ON e.category_id = ec.id
            WHERE e.is_deleted = 0
            GROUP BY ec.category_name
            ORDER BY value DESC
        `).all();

        console.log('--- EXPENSE BREAKDOWN ---');
        breakdown.forEach((b: any) => {
            console.log(`${b.category_name}: ${b.value} (${b.count} txns)`);
        });

        // Test only if there are expenses
        if (breakdown.length > 0) {
            expect(breakdown[0].value).toBeGreaterThanOrEqual(0);
        }
    });

    it('should list Recent Trips', () => {
        const trips = db.prepare(`
            SELECT trip_code, total_revenue, status, departure_date 
            FROM trips 
            WHERE is_deleted = 0
            ORDER BY departure_date DESC 
            LIMIT 5
        `).all();

        console.log('--- RECENT TRIPS ---');
        trips.forEach((t: any) => console.log(`${t.trip_code} | ${t.status} | ${t.total_revenue}`));

        expect(Array.isArray(trips)).toBe(true);
    });

    it('should list Maintenance Alerts', () => {
        const alerts = db.prepare(`
            SELECT v.license_plate, m.status, m.next_service_date
            FROM maintenance_orders m
            JOIN vehicles v ON m.vehicle_id = v.id
            WHERE m.status IN ('scheduled', 'in_progress', 'maintenance')
            AND m.is_deleted = 0
            ORDER BY m.next_service_date ASC
            LIMIT 5
         `).all();

        console.log('--- MAINTENANCE ALERTS ---');
        alerts.forEach((a: any) => console.log(`${a.license_plate} | ${a.status} | due: ${a.next_service_date}`));

        expect(Array.isArray(alerts)).toBe(true);
    });

});
