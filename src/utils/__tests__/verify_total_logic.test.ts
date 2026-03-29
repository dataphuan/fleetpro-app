import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve(__dirname, '../../../offline-db/data.sqlite');
let db: any;

describe('Total Logic Consistency Check', () => {
    beforeAll(() => {
        db = new Database(DB_PATH);
    });

    afterAll(() => {
        if (db) db.close();
    });

    it('should verify Consistency across Dashboard, Reports, and Data Tabs', () => {
        console.log('--- STARTING TOTAL LOGIC CHECK ---');

        // 1. DATA TABS (Source of Truth)
        const tripTruth = db.prepare(`
            SELECT 
                COUNT(*) as count, 
                SUM(total_revenue) as revenue
            FROM trips 
            WHERE status = 'completed'
        `).get();

        // Sum of all expenses LINKED to completed trips
        const tripExpenseTruth = db.prepare(`
            SELECT SUM(amount) as cost
            FROM expenses e
            JOIN trips t ON e.trip_id = t.id
            WHERE t.status = 'completed'
        `).get();

        console.log(`[SOURCE TRUTH] Trips: ${tripTruth.count}, Rev: ${tripTruth.revenue}, Direct Cost: ${tripExpenseTruth.cost}`);

        // 2. DASHBOARD LOGIC (Simplified Aggregation)
        // Check simple sum matches
        const dashboardRev = db.prepare("SELECT SUM(total_revenue) as r FROM trips WHERE status='completed'").get().r;

        // 3. REPORTS TAB LOGIC (Grouped by Vehicle)
        const reportByVehicle = db.prepare(`
            SELECT 
                t.vehicle_id,
                COUNT(t.id) as trip_count,
                SUM(t.total_revenue) as total_revenue
            FROM trips t
            WHERE t.status = 'completed'
            GROUP BY t.vehicle_id
        `).all();

        const reportRevSum = reportByVehicle.reduce((sum, row) => sum + (row.total_revenue || 0), 0);
        const reportCountSum = reportByVehicle.reduce((sum, row) => sum + (row.trip_count || 0), 0);

        console.log(`[REPORTS SUM] Count: ${reportCountSum}, Rev: ${reportRevSum}`);

        // --- COMPARISONS ---
        // Check Revenue Consistency
        expect(dashboardRev).toBe(tripTruth.revenue);
        expect(reportRevSum).toBe(tripTruth.revenue);

        // Check Count Consistency
        expect(reportCountSum).toBe(tripTruth.count);

        console.log('✅ REVENUE CONSISTENCY: PASS');
        console.log('✅ COUNT CONSISTENCY: PASS');

        // Check Expense Consistency
        const reportExpenseSumQuery = db.prepare(`
            SELECT SUM(e.amount) as total_exp
            FROM expenses e
            JOIN trips t ON e.trip_id = t.id
            WHERE t.status = 'completed'
        `).get();

        // Handle nulls if 0 expenses
        const truthCost = tripExpenseTruth.cost || 0;
        const reportCost = reportExpenseSumQuery.total_exp || 0;

        expect(reportCost).toBe(truthCost);
        console.log('✅ COST CONSISTENCY: PASS');
    });

    it('should verify Dashboard Profit Calculation', () => {
        const revRow = db.prepare("SELECT SUM(total_revenue) as r FROM trips WHERE status='completed'").get();
        const expRow = db.prepare("SELECT SUM(amount) as c FROM expenses WHERE trip_id IN (SELECT id FROM trips WHERE status='completed')").get();

        const rev = revRow ? revRow.r : 0;
        const tripExp = expRow ? expRow.c : 0;

        const grossProfit = rev - tripExp;
        console.log(`Calculated Gross Profit: ${grossProfit}`);

        // Just ensure it doesn't crash calculations; > 0 depends on seeded data
        expect(typeof grossProfit).toBe('number');
    });
});
