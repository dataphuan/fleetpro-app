/**
 * LAN Client
 * Handles HTTP requests to the LAN Server
 */

const getBaseUrl = () => {
    const url = localStorage.getItem('lan_server_url');
    return url ? url.replace(/\/$/, '') : 'http://localhost:3000';
};

const getToken = () => localStorage.getItem('lan_token') || '';

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Lan-Token': getToken(),
});

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        let errorMsg = res.statusText;
        try {
            const error = await res.json();
            errorMsg = error.error || error.message || res.statusText;
        } catch (e) {
            // ignore json parse error
        }
        return { success: false, error: errorMsg };
    }
    const data = await res.json();
    return { success: true, data };
};

export const LanClient = {
    vehicles: {
        list: async (limit = 100, offset = 0) => fetch(`${getBaseUrl()}/api/vehicles?limit=${limit}&offset=${offset}`, { headers: getHeaders() }).then(handleResponse),
        getById: async (id: string) => fetch(`${getBaseUrl()}/api/vehicles/${id}`, { headers: getHeaders() }).then(handleResponse),
        create: async (data: any) => fetch(`${getBaseUrl()}/api/vehicles`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        update: async (id: string, data: any) => fetch(`${getBaseUrl()}/api/vehicles/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        softDelete: async (id: string) => fetch(`${getBaseUrl()}/api/vehicles/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
        listByStatus: async (status: string) => fetch(`${getBaseUrl()}/api/vehicles?status=${status}`, { headers: getHeaders() }).then(handleResponse),
        search: async (term: string) => fetch(`${getBaseUrl()}/api/vehicles?search=${encodeURIComponent(term)}`, { headers: getHeaders() }).then(handleResponse),
        getNextCode: async () => fetch(`${getBaseUrl()}/api/vehicles/meta/next-code`, { headers: getHeaders() }).then(handleResponse),
    },

    trips: {
        list: async (limit = 100, offset = 0) => fetch(`${getBaseUrl()}/api/trips?limit=${limit}&offset=${offset}`, { headers: getHeaders() }).then(handleResponse),
        getById: async (id: string) => fetch(`${getBaseUrl()}/api/trips/${id}`, { headers: getHeaders() }).then(handleResponse),
        create: async (data: any) => fetch(`${getBaseUrl()}/api/trips`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        update: async (id: string, data: any) => fetch(`${getBaseUrl()}/api/trips/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        softDelete: async (id: string) => fetch(`${getBaseUrl()}/api/trips/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
        listByDateRange: async (startDate: string, endDate: string) => fetch(`${getBaseUrl()}/api/trips?startDate=${startDate}&endDate=${endDate}`, { headers: getHeaders() }).then(handleResponse),
        listByStatus: async (status: string) => fetch(`${getBaseUrl()}/api/trips?status=${status}`, { headers: getHeaders() }).then(handleResponse),
        search: async (term: string) => fetch(`${getBaseUrl()}/api/trips?search=${encodeURIComponent(term)}`, { headers: getHeaders() }).then(handleResponse),

        confirm: async (id: string) => fetch(`${getBaseUrl()}/api/trips/${id}/confirm`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
        close: async (id: string) => fetch(`${getBaseUrl()}/api/trips/${id}/close`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
        dispatched: async (id: string) => fetch(`${getBaseUrl()}/api/trips/${id}/dispatched`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
        start: async (data: { id: string, actualDepartureTime: string }) => fetch(`${getBaseUrl()}/api/trips/${data.id}/start`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        complete: async (data: { id: string, actualArrivalTime: string, actualDistanceKm: number }) => fetch(`${getBaseUrl()}/api/trips/${data.id}/complete`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        cancel: async (id: string) => fetch(`${getBaseUrl()}/api/trips/${id}/cancel`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
        getLogs: async (id: string) => fetch(`${getBaseUrl()}/api/trips/${id}/logs`, { headers: getHeaders() }).then(handleResponse),
    },

    drivers: {
        list: async () => fetch(`${getBaseUrl()}/api/drivers`, { headers: getHeaders() }).then(handleResponse),
        getById: async (id: string) => fetch(`${getBaseUrl()}/api/drivers/${id}`, { headers: getHeaders() }).then(handleResponse),
        create: async (data: any) => fetch(`${getBaseUrl()}/api/drivers`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        update: async (id: string, data: any) => fetch(`${getBaseUrl()}/api/drivers/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        softDelete: async (id: string) => fetch(`${getBaseUrl()}/api/drivers/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
        listByStatus: async (status: string) => fetch(`${getBaseUrl()}/api/drivers?status=${status}`, { headers: getHeaders() }).then(handleResponse),
        search: async (term: string) => fetch(`${getBaseUrl()}/api/drivers?search=${encodeURIComponent(term)}`, { headers: getHeaders() }).then(handleResponse),
    },

    routes: {
        list: async () => fetch(`${getBaseUrl()}/api/routes`, { headers: getHeaders() }).then(handleResponse),
        getById: async (id: string) => fetch(`${getBaseUrl()}/api/routes/${id}`, { headers: getHeaders() }).then(handleResponse),
        create: async (data: any) => fetch(`${getBaseUrl()}/api/routes`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        update: async (id: string, data: any) => fetch(`${getBaseUrl()}/api/routes/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        softDelete: async (id: string) => fetch(`${getBaseUrl()}/api/routes/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
        search: async (term: string) => fetch(`${getBaseUrl()}/api/routes?search=${encodeURIComponent(term)}`, { headers: getHeaders() }).then(handleResponse),
    },

    customers: {
        list: async () => fetch(`${getBaseUrl()}/api/customers`, { headers: getHeaders() }).then(handleResponse),
        getById: async (id: string) => fetch(`${getBaseUrl()}/api/customers/${id}`, { headers: getHeaders() }).then(handleResponse),
        create: async (data: any) => fetch(`${getBaseUrl()}/api/customers`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        update: async (id: string, data: any) => fetch(`${getBaseUrl()}/api/customers/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        softDelete: async (id: string) => fetch(`${getBaseUrl()}/api/customers/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
        search: async (term: string) => fetch(`${getBaseUrl()}/api/customers?search=${encodeURIComponent(term)}`, { headers: getHeaders() }).then(handleResponse),
        getNextCode: async () => fetch(`${getBaseUrl()}/api/customers/meta/next-code`, { headers: getHeaders() }).then(handleResponse),
    },

    expenses: {
        list: async () => fetch(`${getBaseUrl()}/api/expenses`, { headers: getHeaders() }).then(handleResponse),
        getById: async (id: string) => fetch(`${getBaseUrl()}/api/expenses/${id}`, { headers: getHeaders() }).then(handleResponse),
        create: async (data: any) => fetch(`${getBaseUrl()}/api/expenses`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        update: async (id: string, data: any) => fetch(`${getBaseUrl()}/api/expenses/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        softDelete: async (id: string) => fetch(`${getBaseUrl()}/api/expenses/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
        search: async (term: string) => fetch(`${getBaseUrl()}/api/expenses?search=${encodeURIComponent(term)}`, { headers: getHeaders() }).then(handleResponse),
        listByTrip: async (tripId: string) => fetch(`${getBaseUrl()}/api/expenses?tripId=${tripId}`, { headers: getHeaders() }).then(handleResponse),
        listByStatus: async (status: string) => fetch(`${getBaseUrl()}/api/expenses?status=${status}`, { headers: getHeaders() }).then(handleResponse),
        confirm: async (id: string) => fetch(`${getBaseUrl()}/api/expenses/${id}/confirm`, { method: 'POST', headers: getHeaders() }).then(handleResponse),

        listAllocations: async (expenseId: string) => fetch(`${getBaseUrl()}/api/expenses/${expenseId}/allocations`, { headers: getHeaders() }).then(handleResponse),
        createAllocation: async (data: any) => fetch(`${getBaseUrl()}/api/expenses/allocations`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        deleteAllocation: async (id: string) => fetch(`${getBaseUrl()}/api/expenses/allocations/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
    },

    maintenance: {
        list: async () => fetch(`${getBaseUrl()}/api/maintenance`, { headers: getHeaders() }).then(handleResponse),
        getById: async (id: string) => fetch(`${getBaseUrl()}/api/maintenance/${id}`, { headers: getHeaders() }).then(handleResponse),
        create: async (data: any) => fetch(`${getBaseUrl()}/api/maintenance`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        update: async (id: string, data: any) => fetch(`${getBaseUrl()}/api/maintenance/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        softDelete: async (id: string) => fetch(`${getBaseUrl()}/api/maintenance/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
        listByVehicle: async (vehicleId: string) => fetch(`${getBaseUrl()}/api/maintenance?vehicleId=${vehicleId}`, { headers: getHeaders() }).then(handleResponse),
        listByStatus: async (status: string) => fetch(`${getBaseUrl()}/api/maintenance?status=${status}`, { headers: getHeaders() }).then(handleResponse),
    },

    expenseCategories: {
        list: async () => fetch(`${getBaseUrl()}/api/maintenance/categories`, { headers: getHeaders() }).then(handleResponse), // Map to correct endpoint
    },

    accountingPeriods: {
        listClosed: async () => fetch(`${getBaseUrl()}/api/accounting-periods/closed`, { headers: getHeaders() }).then(handleResponse),
    },

    auth: {
        // Auth is tricky. LAN login? Or just local generic user?
        // Using local auth for now, LAN actions are authenticated by Token.
        // But if we want to manage users on server:
        listUsers: async () => fetch(`${getBaseUrl()}/api/auth/users`, { headers: getHeaders() }).then(handleResponse),
        createUser: async (data: any) => fetch(`${getBaseUrl()}/api/auth/users`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
        updateUserRole: async (userId: string, role: string) => fetch(`${getBaseUrl()}/api/auth/users/${userId}/role`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ role }) }).then(handleResponse),
        deleteUser: async (userId: string) => fetch(`${getBaseUrl()}/api/auth/users/${userId}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
    }
};
