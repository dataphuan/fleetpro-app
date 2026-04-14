/**
 * AI Query Service
 * Provides database query functions that AI can call via Function Calling
 * Uses data adapters to access database
 */

import {
    vehicleAdapter,
    driverAdapter,
    customerAdapter,
    tripAdapter,
    expenseAdapter,
    maintenanceAdapter,
} from '@/lib/data-adapter';

const listFromAdapter = async (adapter: any): Promise<any[]> => {
    const response = await adapter.list();
    return Array.isArray(response) ? response : (response?.data || []);
};

export const aiQueryService = {
    /**
     * Search vehicles by license plate, type, or status
     */
    async searchVehicles(params: {
        licensePlate?: string;
        type?: string;
        status?: string;
    }) {
        let results = await listFromAdapter(vehicleAdapter);

        if (params.licensePlate) {
            results = results.filter(v =>
                v.license_plate?.toLowerCase().includes(params.licensePlate!.toLowerCase())
            );
        }

        if (params.type) {
            results = results.filter(v => v.vehicle_type === params.type);
        }

        if (params.status) {
            results = results.filter(v => v.status === params.status);
        }

        return results.map(v => ({
            id: v.id,
            licensePlate: v.license_plate,
            type: v.vehicle_type,
            status: v.status,
            brand: v.brand,
            model: v.model,
            year: v.year_of_manufacture,
        }));
    },

    /**
     * Search drivers by name, phone, or license number
     */
    async searchDrivers(params: {
        name?: string;
        phone?: string;
        licenseNumber?: string;
    }) {
        let results = await listFromAdapter(driverAdapter);

        if (params.name) {
            results = results.filter(d =>
                d.full_name?.toLowerCase().includes(params.name!.toLowerCase())
            );
        }

        if (params.phone) {
            results = results.filter(d =>
                d.phone_number?.includes(params.phone!)
            );
        }

        if (params.licenseNumber) {
            results = results.filter(d =>
                d.license_number?.includes(params.licenseNumber!)
            );
        }

        return results.map(d => ({
            id: d.id,
            name: d.full_name,
            phone: d.phone_number,
            licenseNumber: d.license_number,
            status: d.status,
            baseSalary: d.base_salary,
        }));
    },

    /**
     * Search customers by name or tax code
     */
    async searchCustomers(params: {
        name?: string;
        taxCode?: string;
    }) {
        let results = await listFromAdapter(customerAdapter);

        if (params.name) {
            results = results.filter(c =>
                c.customer_name.toLowerCase().includes(params.name!.toLowerCase())
            );
        }

        if (params.taxCode) {
            results = results.filter(c =>
                c.tax_code?.includes(params.taxCode!)
            );
        }

        return results.map(c => ({
            id: c.id,
            name: c.customer_name,
            type: c.customer_type,
            taxCode: c.tax_code,
            phone: c.phone_number,
            address: c.address,
        }));
    },

    /**
     * Get trips by vehicle ID
     */
    async getTripsByVehicle(params: {
        vehicleId?: string;
        licensePlate?: string;
        startDate?: string;
        endDate?: string;
    }) {
        let vehicleId = params.vehicleId;

        // If license plate provided, find vehicle ID first
        if (params.licensePlate && !vehicleId) {
            const vehicles = await listFromAdapter(vehicleAdapter);
            const vehicle = vehicles.find((v: any) =>
                v.license_plate.toLowerCase().includes(params.licensePlate!.toLowerCase())
            );
            if (vehicle) vehicleId = vehicle.id;
        }

        if (!vehicleId) {
            return { error: 'Vehicle not found', trips: [] };
        }

        const trips = await listFromAdapter(tripAdapter);
        let results = trips.filter((t: any) => t.vehicle_id === vehicleId);

        if (params.startDate) {
            results = results.filter(t => t.departure_date >= params.startDate!);
        }

        if (params.endDate) {
            results = results.filter(t => t.departure_date <= params.endDate!);
        }

        return {
            vehicleId,
            totalTrips: results.length,
            trips: results.map(t => ({
                tripCode: t.trip_code,
                status: t.status,
                departureDate: t.departure_date,
                revenue: t.total_revenue,
                cargoWeight: t.cargo_weight_tons,
            })),
        };
    },

    /**
     * Get trips by driver ID
     */
    async getTripsByDriver(params: {
        driverId?: string;
        driverName?: string;
        startDate?: string;
        endDate?: string;
    }) {
        let driverId = params.driverId;

        // If driver name provided, find driver ID first
        if (params.driverName && !driverId) {
            const drivers = await listFromAdapter(driverAdapter);
            const driver = drivers.find((d: any) =>
                d.full_name.toLowerCase().includes(params.driverName!.toLowerCase())
            );
            if (driver) driverId = driver.id;
        }

        if (!driverId) {
            return { error: 'Driver not found', trips: [] };
        }

        const trips = await listFromAdapter(tripAdapter);
        let results = trips.filter((t: any) => t.driver_id === driverId);

        if (params.startDate) {
            results = results.filter(t => t.departure_date >= params.startDate!);
        }

        if (params.endDate) {
            results = results.filter(t => t.departure_date <= params.endDate!);
        }

        const totalRevenue = results.reduce((sum, t) => sum + (t.total_revenue || 0), 0);

        return {
            driverId,
            totalTrips: results.length,
            totalRevenue,
            trips: results.map(t => ({
                tripCode: t.trip_code,
                status: t.status,
                departureDate: t.departure_date,
                revenue: t.total_revenue,
            })),
        };
    },

    /**
     * Get revenue statistics for a date range
     */
    async getRevenueStats(params: {
        startDate: string;
        endDate: string;
    }) {
        const trips = await listFromAdapter(tripAdapter);
        const filtered = trips.filter((t: any) =>
            t.departure_date >= params.startDate &&
            t.departure_date <= params.endDate
        );

        const totalRevenue = filtered.reduce((sum, t) => sum + (t.total_revenue || 0), 0);
        const closedTrips = filtered.filter(t => t.status === 'closed');
        const closedRevenue = closedTrips.reduce((sum, t) => sum + (t.total_revenue || 0), 0);

        return {
            period: `${params.startDate} đến ${params.endDate}`,
            totalTrips: filtered.length,
            closedTrips: closedTrips.length,
            totalRevenue,
            closedRevenue,
            avgRevenuePerTrip: filtered.length > 0 ? totalRevenue / filtered.length : 0,
        };
    },

    /**
     * Get expense breakdown by category
     */
    async getExpensesByCategory(params: {
        category?: string;
        startDate?: string;
        endDate?: string;
    }) {
        const expenses = await listFromAdapter(expenseAdapter);
        let results = expenses;

        if (params.category) {
            results = results.filter(e => e.category_id === params.category);
        }

        if (params.startDate) {
            results = results.filter(e => e.expense_date >= params.startDate!);
        }

        if (params.endDate) {
            results = results.filter(e => e.expense_date <= params.endDate!);
        }

        const totalAmount = results.reduce((sum, e) => sum + (e.amount || 0), 0);

        // Group by category
        const byCategory: Record<string, { count: number; total: number }> = {};
        results.forEach(e => {
            if (!byCategory[e.category_id]) {
                byCategory[e.category_id] = { count: 0, total: 0 };
            }
            byCategory[e.category_id].count++;
            byCategory[e.category_id].total += e.amount || 0;
        });

        return {
            totalExpenses: results.length,
            totalAmount,
            byCategory,
        };
    },

    /**
     * Get maintenance alerts for vehicles
     */
    async getMaintenanceAlerts(params: {
        vehicleId?: string;
        licensePlate?: string;
    }) {
        let vehicleId = params.vehicleId;

        if (params.licensePlate && !vehicleId) {
            const vehicles = await listFromAdapter(vehicleAdapter);
            const vehicle = vehicles.find((v: any) =>
                v.license_plate.toLowerCase().includes(params.licensePlate!.toLowerCase())
            );
            if (vehicle) vehicleId = vehicle.id;
        }

        const maintenance = await listFromAdapter(maintenanceAdapter);
        let results = maintenance;

        if (vehicleId) {
            results = results.filter(m => m.vehicle_id === vehicleId);
        }

        // Filter for upcoming or pending maintenance
        const pending = results.filter(m =>
            m.status === 'scheduled' || m.status === 'in_progress'
        );

        return {
            totalAlerts: pending.length,
            alerts: pending.map(m => ({
                orderCode: m.order_code,
                vehicleId: m.vehicle_id,
                type: m.maintenance_type,
                scheduledDate: m.scheduled_date,
                status: m.status,
                estimatedCost: m.estimated_cost,
            })),
        };
    },

    /**
     * Get vehicle count by status
     */
    async getVehicleStats() {
        const vehicles = await listFromAdapter(vehicleAdapter);

        const byStatus: Record<string, number> = {};
        vehicles.forEach((v: any) => {
            byStatus[v.status] = (byStatus[v.status] || 0) + 1;
        });

        return {
            total: vehicles.length,
            byStatus,
        };
    },

    /**
     * Get driver count by status
     */
    async getDriverStats() {
        const drivers = await listFromAdapter(driverAdapter);

        const byStatus: Record<string, number> = {};
        drivers.forEach((d: any) => {
            byStatus[d.status] = (byStatus[d.status] || 0) + 1;
        });

        return {
            total: drivers.length,
            byStatus,
        };
    },

    /**
     * Get top drivers by completed trips
     */
    async getTopDrivers(params: { limit?: number; startDate?: string; endDate?: string }) {
        const trips = await listFromAdapter(tripAdapter);
        const drivers = await listFromAdapter(driverAdapter);

        const limit = params.limit || 5;

        // Filter trips by date and status
        const completedTrips = trips.filter(t => {
            const isCompleted = t.status === 'completed';
            if (!isCompleted) return false;
            if (params.startDate && t.departure_date < params.startDate) return false;
            if (params.endDate && t.departure_date > params.endDate) return false;
            return true;
        });

        // Count trips per driver
        const driverTrips: Record<string, { count: number; revenue: number }> = {};
        completedTrips.forEach(t => {
            if (!driverTrips[t.driver_id]) {
                driverTrips[t.driver_id] = { count: 0, revenue: 0 };
            }
            driverTrips[t.driver_id].count++;
            driverTrips[t.driver_id].revenue += t.total_revenue || 0;
        });

        // Sort and get top drivers
        const sortedDrivers = Object.entries(driverTrips)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, limit);

        return sortedDrivers.map(([driverId, stats]) => {
            const driver = drivers.find(d => d.id === driverId);
            return {
                driverName: driver?.full_name || 'Unknown',
                phone: driver?.phone_number || '',
                tripCount: stats.count,
                totalRevenue: stats.revenue,
            };
        });
    },

    /**
     * Get top customers by revenue
     */
    async getTopCustomers(params: { limit?: number; startDate?: string; endDate?: string }) {
        const trips = await listFromAdapter(tripAdapter);
        const customers = await listFromAdapter(customerAdapter);

        const limit = params.limit || 5;

        // Filter trips by date
        const filteredTrips = trips.filter(t => {
            if (params.startDate && t.departure_date < params.startDate) return false;
            if (params.endDate && t.departure_date > params.endDate) return false;
            return true;
        });

        // Sum revenue per customer
        const customerRevenue: Record<string, number> = {};
        filteredTrips.forEach(t => {
            if (t.customer_id) {
                customerRevenue[t.customer_id] = (customerRevenue[t.customer_id] || 0) + (t.total_revenue || 0);
            }
        });

        // Sort and get top customers
        const sortedCustomers = Object.entries(customerRevenue)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);

        return sortedCustomers.map(([customerId, revenue]) => {
            const customer = customers.find(c => c.id === customerId);
            return {
                customerName: customer?.customer_name || 'Unknown',
                companyName: customer?.company_name || '',
                totalRevenue: revenue,
            };
        });
    },

    /**
     * Get pending trips that need attention
     */
    async getPendingTrips() {
        const trips = await listFromAdapter(tripAdapter);
        const vehicles = await listFromAdapter(vehicleAdapter);
        const drivers = await listFromAdapter(driverAdapter);

        const pending = trips.filter(t =>
            t.status === 'scheduled' || t.status === 'confirmed' || t.status === 'in_transit'
        );

        return pending.map(t => {
            const vehicle = vehicles.find(v => v.id === t.vehicle_id);
            const driver = drivers.find(d => d.id === t.driver_id);
            return {
                tripCode: t.trip_code,
                status: t.status,
                departureDate: t.departure_date,
                origin: t.origin,
                destination: t.destination,
                vehiclePlate: vehicle?.license_plate || 'N/A',
                driverName: driver?.full_name || 'N/A',
            };
        });
    },

    /**
     * Get dashboard summary for quick overview
     */
    async getDashboardSummary(params: { startDate?: string; endDate?: string }) {
        const trips = await listFromAdapter(tripAdapter);
        const vehicles = await listFromAdapter(vehicleAdapter);
        const drivers = await listFromAdapter(driverAdapter);
        const expenses = await listFromAdapter(expenseAdapter);

        // Filter by date if provided
        const filteredTrips = trips.filter(t => {
            if (params.startDate && t.departure_date < params.startDate) return false;
            if (params.endDate && t.departure_date > params.endDate) return false;
            return true;
        });

        const filteredExpenses = expenses.filter(e => {
            if (params.startDate && e.expense_date < params.startDate) return false;
            if (params.endDate && e.expense_date > params.endDate) return false;
            return true;
        });

        // Calculate stats
        const totalRevenue = filteredTrips.reduce((sum, t) => sum + (t.total_revenue || 0), 0);
        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const completedTrips = filteredTrips.filter(t => t.status === 'completed').length;
        const pendingTrips = filteredTrips.filter(t => ['scheduled', 'confirmed', 'in_transit'].includes(t.status)).length;
        const activeVehicles = vehicles.filter(v => v.status === 'active').length;
        const activeDrivers = drivers.filter(d => d.status === 'active').length;

        return {
            totalRevenue,
            totalExpenses,
            profit: totalRevenue - totalExpenses,
            tripStats: {
                total: filteredTrips.length,
                completed: completedTrips,
                pending: pendingTrips,
            },
            fleetStats: {
                totalVehicles: vehicles.length,
                activeVehicles,
                totalDrivers: drivers.length,
                activeDrivers,
            },
        };
    },
};
