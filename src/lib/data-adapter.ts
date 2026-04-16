/**
 * Data Adapter Layer (Factory Pattern) - FIREBASE EDITION
 * Provides interface for data access to Firebase Firestore
 */

import { app, db, auth, firebaseConfig, functions } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, addDoc, writeBatch, getCountFromServer } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { normalizeUserRole } from './rbac';
import { validateAdapterData } from './schemas';
import { TENANT_DEMO_SEED } from '../data/tenantDemoSeed';
import { getNextSequentialId } from './id-service';
import { googleDriveService } from '../services/googleDrive';
import { PLAN_LIMITS as PLAN_LIMITS_CONFIG, MUTATION_THROTTLE_WINDOW_MS, INTERNAL_TENANT_WHITELIST } from '../config/constants';

const mutationLastSeen = new Map<string, number>();

const buildMutationKey = (collectionName: string, action: string, id?: string, payload?: any) => {
    const userId = auth.currentUser?.uid || 'anonymous';
    const tenantId = runtimeTenantId || 'no-tenant';
    const stableToken = id
        || payload?.id
        || payload?.trip_id
        || payload?.order_code
        || payload?.trip_code
        || payload?.expense_code
        || payload?.vehicle_id
        || payload?.driver_id
        || payload?.license_plate
        || payload?.vehicle_code
        || payload?.driver_code
        || payload?.customer_code
        || payload?.route_code
        || '';
    return `${tenantId}:${userId}:${collectionName}:${action}:${stableToken}`;
};

const enforceMutationThrottle = (collectionName: string, action: string, id?: string, payload?: any) => {
    const key = buildMutationKey(collectionName, action, id, payload);
    const now = Date.now();
    const prev = mutationLastSeen.get(key);
    if (prev && now - prev < MUTATION_THROTTLE_WINDOW_MS) {
        throw new Error('Thao tác quá nhanh. Vui lòng chờ một giây rồi thử lại.');
    }
    mutationLastSeen.set(key, now);
};

// Helper to check environment
export const isElectron = () => {
    return typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
};

// Check if running in web browser (not Electron)
export const isWeb = () => {
    return !isElectron();
};

let runtimeTenantId: string | null = null;

export const setRuntimeTenantId = (id: string | null) => {
    runtimeTenantId = id;
    if (id && typeof localStorage !== 'undefined') {
        localStorage.setItem('fleetpro_tenant_id', id);
    }
};

export const getTenantId = () => {
    if (runtimeTenantId) return runtimeTenantId;
    
    // Check localStorage first (persistent across refreshes)
    if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem('fleetpro_tenant_id');
        if (cached) {
            runtimeTenantId = cached;
            return cached;
        }
    }

    // Fallback: Try to get tenant_id from current auth user
    if (auth.currentUser) {
        // We can't easily wait for a doc fetch here synchronously, 
        // but we can check if it was set in a previous session.
        return ''; 
    }
    
    return ''; 
};

const US_CENTRAL1_FUNCTIONS = getFunctions(app, 'us-central1');

const shouldRetryCallableInFallbackRegion = (error: any) => {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || '').toLowerCase();
    return (
        code.includes('not-found')
        || code.includes('unavailable')
        || code.includes('internal')
        || message.includes('not found')
        || message.includes('internal')
    );
};

const callCallableWithRegionFallback = async (name: string, payload: any) => {
    try {
        const primaryFn = httpsCallable(functions, name);
        return await primaryFn(payload);
    } catch (error: any) {
        if (!shouldRetryCallableInFallbackRegion(error)) {
            throw error;
        }

        const fallbackFn = httpsCallable(US_CENTRAL1_FUNCTIONS, name);
        return await fallbackFn(payload);
    }
};

const buildTripFinancialFields = (row: any) => {
    const grossRevenue = Number(row?.freight_revenue || 0)
        + Number(row?.actual_revenue || 0)
        + Number(row?.additional_charges || 0);
    const totalCost = Number(row?.fuel_cost || 0)
        + Number(row?.driver_advance || 0)
        + Number(row?.toll_cost || 0);
    return {
        gross_revenue: grossRevenue,
        total_cost: totalCost,
        gross_profit: grossRevenue - totalCost,
    };
};

const createTripDirectWrite = async (validatedData: any, tenantId: string) => {
    const nowIso = new Date().toISOString();

    // AUTO-APPROVE: Driver drafts with route + vehicle → auto-confirm
    let finalStatus = validatedData.status || 'draft';
    if (
        finalStatus === 'draft' &&
        validatedData.route_id &&
        validatedData.vehicle_id &&
        validatedData.driver_id &&
        (validatedData.source === 'driver' || validatedData.trip_code?.startsWith('LĐX'))
    ) {
        finalStatus = 'confirmed';
        console.log('[Auto-approve] Driver trip auto-confirmed:', validatedData.trip_code);
    }

    const payload = {
        ...validatedData,
        status: finalStatus,
        tenant_id: tenantId,
        created_at: nowIso,
        updated_at: nowIso,
        ...(finalStatus === 'confirmed' && validatedData.status === 'draft' ? { auto_approved: true, auto_approved_at: nowIso } : {}),
        ...buildTripFinancialFields(validatedData),
    };

    const docRef = await addDoc(collection(db, 'trips'), payload);
    // Sync to public_tracking for unauthenticated customer lookups
    syncPublicTracking(docRef.id, payload).catch(() => null);
    return { id: docRef.id, payload };
};

const updateTripDirectWrite = async (id: string, oldData: any, validatedData: any) => {
    const merged = { ...oldData, ...validatedData };
    const patch = {
        ...validatedData,
        updated_at: new Date().toISOString(),
        ...buildTripFinancialFields(merged),
    };
    await updateDoc(doc(db, 'trips', id), patch);
    // Sync to public_tracking for unauthenticated customer lookups
    syncPublicTracking(id, { ...oldData, ...patch }).catch(() => null);
    return patch;
};

/**
 * Sync safe public fields to public_tracking collection.
 * This collection has `allow read: if true` in Firestore rules,
 * enabling customers to track shipments without login.
 * NEVER includes: revenue, costs, driver phone, internal notes.
 */
const syncPublicTracking = async (tripId: string, tripData: any) => {
    try {
        const publicData = {
            trip_code: tripData.trip_code || '',
            status: tripData.status || 'draft',
            origin: tripData.origin || tripData.route?.origin || '',
            destination: tripData.destination || tripData.route?.destination || '',
            departure_date: tripData.departure_date || tripData.created_at || '',
            arrival_date: tripData.arrival_date || tripData.completed_at || null,
            vehicle_plate: tripData.vehicle?.license_plate || tripData.vehicle_plate || null,
            route_name: tripData.route?.route_name || tripData.route_name || null,
            distance_km: tripData.distance_km || tripData.route?.distance_km || null,
            updated_at: tripData.updated_at || new Date().toISOString(),
            tenant_id: tripData.tenant_id || '',
        };
        await setDoc(doc(db, 'public_tracking', tripId), publicData, { merge: true });
    } catch (e) {
        console.warn('[syncPublicTracking] Failed:', e);
    }
};

/**
 * Log administrative and data mutation activities for audit readiness
 */
/**
 * Helper to build log payload for batch writes or direct logging
 */
const buildLogPayload = (action: string, collectionName: string, entityId: string, metadata?: any) => {
    const user = auth.currentUser;
    const tenantId = getTenantId();
    if (!user || !tenantId || collectionName === 'system_logs') return null;

    let delta = metadata?.changes || null;
    if (action === 'UPDATE' && metadata?.previous && metadata?.changes) {
        delta = {};
        for (const key in metadata.changes) {
            if (metadata.changes[key] !== metadata.previous[key]) {
                delta[key] = { from: metadata.previous[key] ?? null, to: metadata.changes[key] };
            }
        }
        if (Object.keys(delta).length === 0) return null;
    }

    return {
        timestamp: new Date().toISOString(),
        user_id: user.uid,
        user_email: user.email,
        tenant_id: tenantId,
        action,
        collection_name: collectionName,
        entity_id: entityId,
        metadata: { ...metadata, delta }
    };
};

const logActivity = async (action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LOGIN' | 'ROLE_CHANGE', collectionName: string, entityId: string, metadata?: any) => {
    try {
        const payload = buildLogPayload(action, collectionName, entityId, metadata);
        if (payload) {
            await addDoc(collection(db, 'system_logs'), payload);
        }
    } catch (e) {
        console.error("Audit Log Failure:", e);
    }
};

/**
 * SaaS Quota Enforcement
 */
const PLAN_LIMITS = PLAN_LIMITS_CONFIG;

const checkQuotas = async (tenantId: string, collectionName: string) => {
    const settingsDoc = await getDoc(doc(db, 'company_settings', tenantId));
    const companySettings = settingsDoc.exists() ? settingsDoc.data() : null;
    const sub = companySettings?.subscription || { plan: 'trial' };
    let plan = sub?.plan || 'trial';
    
    // QA AUDIT FIX P0-SEC-03: Explicit whitelist for internal/demo tenants only
    const lowTenantId = tenantId.toLowerCase();
    const isMasterDemo = INTERNAL_TENANT_WHITELIST.has(lowTenantId);

    if (isMasterDemo) {
        plan = 'enterprise';
    }

    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;

    // Map collection to quota key
    const quotaMap: Record<string, string> = {
        vehicles: 'vehicles',
        drivers: 'drivers',
        trips: 'trips_per_month'
    };

    const quotaKey = quotaMap[collectionName];
    if (!quotaKey) return; // No quota for this collection
    if (limits[quotaKey] === Infinity) return; // Enterprise — skip count entirely

    // --- P2 FIX: Use getCountFromServer aggregation instead of full collection read ---
    // Before: adapter.count() fetched ALL documents just to count them (expensive)
    // After: single server-side aggregation, 1 read unit regardless of collection size
    const countQuery = query(
        collection(db, collectionName),
        where('tenant_id', '==', tenantId)
    );
    const snapshot = await getCountFromServer(countQuery);
    const count = snapshot.data().count;
    // ---------------------------------------------------------------------------------

    if (count >= limits[quotaKey]) {
        throw new Error(`QUOTA_EXCEEDED: Gói [${plan.toUpperCase()}] đã đạt giới hạn ${limits[quotaKey]} ${quotaKey}. Vui lòng nâng cấp để tiếp tục.`);
    }
};

/**
 * Enterprise Logic Guard: Trip Status State Machine
 */
const checkStatusTransition = (oldStatus: string, newStatus: string) => {
    if (!oldStatus || !newStatus || oldStatus === newStatus) return;

    // Terminal states - no escape
    if (oldStatus === 'closed' || oldStatus === 'cancelled') {
        throw new Error(`Critical Logic Breach: Cannot modify status of a ${oldStatus.toUpperCase()} trip.`);
    }

    const validTransitions: Record<string, string[]> = {
        'draft': ['pending', 'confirmed', 'cancelled'],
        'pending': ['confirmed', 'cancelled', 'draft'],
        'confirmed': ['dispatched', 'cancelled', 'draft'],
        'dispatched': ['in_progress', 'cancelled', 'confirmed'],
        'in_progress': ['completed', 'cancelled'],
        'completed': ['closed', 'cancelled']
    };

    if (!validTransitions[oldStatus]?.includes(newStatus)) {
        throw new Error(`Quy trình không hợp lệ: Không thể chuyển từ [${oldStatus}] sang [${newStatus}].`);
    }
};

// --- QA P0+P1+P2 CROSS INTEGRITY CHECKER ---
const runCrossIntegrity = async (collectionName: string, data: any, tenantId: string, oldData?: any) => {
    if (!data || !tenantId) return;

    if (collectionName === 'trips') {
        const isOperational = data.status && data.status !== 'draft' && data.status !== 'cancelled';
        
        // R04: Tenant Guard
        if (data.vehicle_id) {
            const vSnap = await getDoc(doc(db, 'vehicles', data.vehicle_id));
            if (vSnap.exists()) {
                const vehicle = vSnap.data();
                if (vehicle?.tenant_id !== tenantId) throw new Error('Xe này thuộc đối tác/công ty khác, không thể điều phối.');
                
                // R46: Maintenance Threshold (P1)
                if (isOperational && (data.status === 'dispatched' || data.status === 'in_progress')) {
                    const currentOdo = vehicle.current_odometer || 0;
                    const nextMaint = vehicle.next_maintenance_odometer || 0;
                    if (nextMaint > 0 && currentOdo >= nextMaint) {
                        throw new Error(`Cảnh báo R46: Xe ${vehicle.license_plate} đã quá hạn bảo trì (${currentOdo} >= ${nextMaint}). Vui lòng bảo trì trước khi điều phối.`);
                    }
                }
            }
        }
        if (data.driver_id) {
            const dSnap = await getDoc(doc(db, 'drivers', data.driver_id));
            if (dSnap.exists()) {
                const driver = dSnap.data();
                if (driver.tenant_id !== tenantId) throw new Error('Tài xế này thuộc đối tác/công ty khác, không thể điều phối.');
                
                // R47: Driver active/license guard
                if (isOperational) {
                    if (driver.status === 'inactive') throw new Error('Tài xế này đang ngưng hoạt động.');
                    if (driver.license_expiry_date && new Date(driver.license_expiry_date) < new Date()) {
                        throw new Error('Giấy phép lái xe đã hết hạn, không thể điều phối.');
                    }
                }
            }
        }

        // R12: Timeline Audit (P1)
        if (data.confirmed_at && data.created_at && new Date(data.confirmed_at) < new Date(data.created_at)) {
             console.warn(`[CẢNH BÁO R12] Ngày xác nhận ${data.confirmed_at} trước ngày tạo ${data.created_at}.`);
        }

        // R18 & R19: Overlap Guard
        if (isOperational && (!oldData || oldData.status !== data.status)) {
            const activeTrpsQ = query(collection(db, 'trips'), where("tenant_id", "==", tenantId), where("status", "in", ["dispatched", "in_progress"]));
            const activeSnaps = await getDocs(activeTrpsQ);
            for (const docSnap of activeSnaps.docs) {
                if (docSnap.id === (data.id || oldData?.id)) continue;
                const trip = docSnap.data();
                if (data.vehicle_id && trip.vehicle_id === data.vehicle_id) throw new Error('Cảnh báo R18: Xe đang kẹt một chuyến đi khác cùng thời gian.');
                if (data.driver_id && trip.driver_id === data.driver_id) throw new Error('Cảnh báo R19: Tài xế đang phụ trách chuyến đi khác.');
            }
        }

        // R48: Route change auto-recalculation (P1)
        if (data.route_id && oldData && data.route_id !== oldData.route_id) {
            const rSnap = await getDoc(doc(db, 'routes', data.route_id));
            if (rSnap.exists()) {
                const route = rSnap.data();
                data.freight_revenue = route.standard_freight_rate || 0;
            }
        }

        // R24 & R25: Odometer Verification and Auto-check
        if (data.start_odometer !== undefined && data.end_odometer !== undefined) {
             const expectedKm = Number(data.end_odometer) - Number(data.start_odometer);
             const actualKm = Number(data.actual_distance_km !== undefined ? data.actual_distance_km : 0);
             if (expectedKm !== actualKm && actualKm > 0) {
                 console.warn(`[CẢNH BÁO R25] Lệch ODO và KM thực tế. Thực đi: ${actualKm}, ODO logic: ${expectedKm}. Hệ thống chỉ Verify và ghi nhận rủi ro gian lận.`);
             }
        }
        
        // R32, 34, 35: Auto calculate totals for P&L
        const rev = Number(data.freight_revenue || 0) + Number(data.actual_revenue || 0) + Number(data.additional_charges || 0);
        const cost = Number(data.fuel_cost || 0) + Number(data.driver_advance || 0) + Number(data.toll_cost || 0);
        data.gross_revenue = rev;
        data.total_cost = cost;
        data.gross_profit = rev - cost;
    }

    if (collectionName === 'expenses') {
        // R17: Cancelled Trip Protection (P1)
        if (data.trip_id) {
            const tSnap = await getDoc(doc(db, 'trips', data.trip_id));
            if (tSnap.exists()) {
                const trip = tSnap.data();
                if (trip.status === 'cancelled' && data.category !== 'CANCEL_FEE') {
                    throw new Error('Cảnh báo R17: Không thể ghi nhận chi phí vào chuyến đi đã bị hủy.');
                }
                
                // R43: Early Accounting Alert (P2)
                if (trip.status === 'planned' || trip.status === 'confirmed') {
                    console.warn(`[CẢNH BÁO R43] Ghi nhận chi phí thực tế cho chuyến đi chưa khởi hành (${trip.status}).`);
                }
            }
        }
        
        // R20: Expense Boundary (P1)
        if (data.reconciliation_date && data.trip_id) {
            const tSnap = await getDoc(doc(db, 'trips', data.trip_id));
            if (tSnap.exists()) {
                const trip = tSnap.data();
                if (trip.completed_at) {
                    const diffDays = Math.abs(new Date(data.reconciliation_date).getTime() - new Date(trip.completed_at).getTime()) / (1000 * 3600 * 24);
                    if (diffDays > 30) {
                        console.warn(`[CẢNH BÁO R20] Chi phí phát sinh quá xa ngày hoàn thành chuyến (>30 ngày).`);
                    }
                }
            }
        }
    }

    if (collectionName === 'maintenance' && data.vehicle_id) {
        const vSnap = await getDoc(doc(db, 'vehicles', data.vehicle_id));
        if (vSnap.exists() && vSnap.data().tenant_id !== tenantId) throw new Error('Bảo trì không hợp lệ: Xe thuộc tenant khác.');
    }

    if (collectionName === 'transportOrders' && data.customer_id) {
        const cSnap = await getDoc(doc(db, 'customers', data.customer_id));
        if (cSnap.exists() && cSnap.data().tenant_id !== tenantId) throw new Error('Đơn hàng không hợp lệ: Khách hàng thuộc tenant khác.');
    }
};
// -------------------------------------

const pickRefId = (row: any, keys: string[]) => {
    for (const key of keys) {
        const value = row?.[key];
        if (typeof value === 'string' && value.trim()) return value;
    }
    return null;
};

const getTenantRows = async (collectionName: string) => {
    const tenantId = getTenantId();
    const q = query(collection(db, collectionName), where('tenant_id', '==', tenantId));
    const snap = await getDocs(q);
    return snap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((row: any) => row.is_deleted !== 1);
};

const buildIdMap = (rows: any[]) => {
    const map = new Map<string, any>();
    rows.forEach((row) => map.set(String(row.id), row));
    return map;
};

const enrichTripsWithRelations = async (rows: any[]) => {
    if (!rows?.length) return rows;

    const [vehicles, drivers, customers, routes] = await Promise.all([
        getTenantRows('vehicles'),
        getTenantRows('drivers'),
        getTenantRows('customers'),
        getTenantRows('routes'),
    ]);

    const vehicleMap = buildIdMap(vehicles);
    const driverMap = buildIdMap(drivers);
    const customerMap = buildIdMap(customers);
    const routeMap = buildIdMap(routes);

    const vehicleByPlate = new Map<string, any>();
    const vehicleByCode = new Map<string, any>();
    vehicles.forEach((v: any) => {
        if (v.license_plate) vehicleByPlate.set(String(v.license_plate).toLowerCase(), v);
        if (v.vehicle_code) vehicleByCode.set(String(v.vehicle_code).toLowerCase(), v);
    });

    const driverByCode = new Map<string, any>();
    const driverByName = new Map<string, any>();
    drivers.forEach((d: any) => {
        if (d.driver_code) driverByCode.set(String(d.driver_code).toLowerCase(), d);
        if (d.full_name) driverByName.set(String(d.full_name).toLowerCase(), d);
    });

    const customerByCode = new Map<string, any>();
    const customerByName = new Map<string, any>();
    customers.forEach((c: any) => {
        if (c.customer_code) customerByCode.set(String(c.customer_code).toLowerCase(), c);
        if (c.customer_name) customerByName.set(String(c.customer_name).toLowerCase(), c);
        if (c.name) customerByName.set(String(c.name).toLowerCase(), c);
    });

    const routeByCode = new Map<string, any>();
    const routeByName = new Map<string, any>();
    routes.forEach((r: any) => {
        if (r.route_code) routeByCode.set(String(r.route_code).toLowerCase(), r);
        if (r.route_name) routeByName.set(String(r.route_name).toLowerCase(), r);
        if (r.name) routeByName.set(String(r.name).toLowerCase(), r);
    });

    return rows.map((row: any) => {
        const vehicleId = pickRefId(row, ['vehicle_id', 'vehicleId']);
        const driverId = pickRefId(row, ['driver_id', 'driverId']);
        const customerId = pickRefId(row, ['customer_id', 'customerId']);
        const routeId = pickRefId(row, ['route_id', 'routeId']);

        const fallbackVehicle = vehicleByPlate.get(String(row.license_plate || row.vehicle_plate || row['Biển số xe'] || '').toLowerCase())
            || vehicleByCode.get(String(row.vehicle_code || row['Mã xe'] || '').toLowerCase())
            || null;
        const fallbackDriver = driverByCode.get(String(row.driver_code || row['Mã tài xế'] || '').toLowerCase())
            || driverByName.get(String(row.driver_name || row.driver_full_name || row['Tài xế'] || '').toLowerCase())
            || null;
        const fallbackCustomer = customerByCode.get(String(row.customer_code || row['Mã khách hàng'] || '').toLowerCase())
            || customerByName.get(String(row.customer_name || row['Khách hàng'] || '').toLowerCase())
            || null;
        const fallbackRoute = routeByCode.get(String(row.route_code || row['Mã tuyến'] || '').toLowerCase())
            || routeByName.get(String(row.route_name || row['Tuyến đường'] || '').toLowerCase())
            || null;

        const vehicle = (vehicleId ? vehicleMap.get(vehicleId) : null) || fallbackVehicle;
        const driver = (driverId ? driverMap.get(driverId) : null) || fallbackDriver;
        const customer = (customerId ? customerMap.get(customerId) : null) || fallbackCustomer;
        const route = (routeId ? routeMap.get(routeId) : null) || fallbackRoute;

        return {
            ...row,
            vehicle_id: vehicleId || vehicle?.id || row.vehicle_id || null,
            driver_id: driverId || driver?.id || row.driver_id || null,
            customer_id: customerId || customer?.id || row.customer_id || null,
            route_id: routeId || route?.id || row.route_id || null,
            vehicle: vehicle || null,
            driver: driver || null,
            customer: customer || null,
            route: route || null,
        };
    });
};

const enrichExpensesWithRelations = async (rows: any[]) => {
    if (!rows?.length) return rows;

    const [vehicles, drivers, trips, categories] = await Promise.all([
        getTenantRows('vehicles'),
        getTenantRows('drivers'),
        getTenantRows('trips'),
        getTenantRows('expenseCategories'),
    ]);

    const vehicleMap = buildIdMap(vehicles);
    const driverMap = buildIdMap(drivers);
    const tripMap = buildIdMap(trips);
    const categoryMap = buildIdMap(categories);

    const tripByCode = new Map<string, any>();
    trips.forEach((t: any) => {
        if (t.trip_code) tripByCode.set(String(t.trip_code).toLowerCase(), t);
    });

    const vehicleByPlate = new Map<string, any>();
    vehicles.forEach((v: any) => {
        if (v.license_plate) vehicleByPlate.set(String(v.license_plate).toLowerCase(), v);
    });

    const driverByCode = new Map<string, any>();
    drivers.forEach((d: any) => {
        if (d.driver_code) driverByCode.set(String(d.driver_code).toLowerCase(), d);
    });

    return rows.map((row: any) => {
        const vehicleId = pickRefId(row, ['vehicle_id', 'vehicleId']);
        const driverId = pickRefId(row, ['driver_id', 'driverId']);
        const tripId = pickRefId(row, ['trip_id', 'tripId']);
        const categoryId = pickRefId(row, ['category_id', 'categoryId']);

        const fallbackTrip = tripByCode.get(String(row.trip_code || row['Mã chuyến'] || '').toLowerCase()) || null;
        const fallbackVehicle = vehicleByPlate.get(String(row.license_plate || row['Biển số xe'] || '').toLowerCase()) || null;
        const fallbackDriver = driverByCode.get(String(row.driver_code || row['Mã tài xế'] || '').toLowerCase()) || null;

        const linkedTrip = (tripId ? (tripMap.get(tripId) || null) : null) || fallbackTrip;
        const linkedVehicle = (vehicleId ? (vehicleMap.get(vehicleId) || null) : null) || fallbackVehicle;
        const linkedDriver = (driverId ? (driverMap.get(driverId) || null) : null) || fallbackDriver;

        return {
            ...row,
            vehicle_id: vehicleId || linkedVehicle?.id || linkedTrip?.vehicle_id || row.vehicle_id || null,
            driver_id: driverId || linkedDriver?.id || linkedTrip?.driver_id || row.driver_id || null,
            trip_id: tripId || linkedTrip?.id || row.trip_id || null,
            category_id: categoryId || row.category_id || null,
            vehicle: linkedVehicle || null,
            driver: linkedDriver || null,
            trip: linkedTrip || null,
            category: categoryId ? (categoryMap.get(categoryId) || null) : null,
        };
    });
};

const createFirestoreAdapter = (collectionName: string) => ({
    list: async (limitCount?: number, offsetCount?: number) => {
        const tenantId = getTenantId();
        const q = query(collection(db, collectionName), where("tenant_id", "==", tenantId));
        const snapshot = await getDocs(q);
        let rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const isDemo = isProtectedSharedDemoTenant(tenantId);
        
        // Fallback: Use demo seed data if Firestore is empty (ONLY FOR DEMO/TRIAL TENANTS IN DEV)
        if (rows.length === 0 && import.meta.env.DEV && isDemo) {
            const demoCollection = (TENANT_DEMO_SEED.collections as any)[collectionName];
            if (demoCollection && Array.isArray(demoCollection)) {
                rows = JSON.parse(JSON.stringify(demoCollection)).map((item: any) => ({ ...item }));
                console.log(`📊 [Demo Data] Loaded ${rows.length} items from ${collectionName} seed (Firestore empty)`);
            }
        }

        if (collectionName === 'vehicles') {
            rows = rows.map((row: any) => {
                const mapped = { ...row };
                mapped.insurance_expiry_civil = mapped.insurance_expiry_civil || mapped.insurance_civil_expiry || mapped.insurance_expiry_date;
                mapped.insurance_expiry_body = mapped.insurance_expiry_body || mapped.insurance_body_expiry || mapped.insurance_expiry_date;
                mapped.insurance_civil_expiry = mapped.insurance_civil_expiry || mapped.insurance_expiry_civil;
                mapped.insurance_body_expiry = mapped.insurance_body_expiry || mapped.insurance_expiry_body;
                mapped.registration_cycle = mapped.registration_cycle || mapped.inspection_cycle || '6 tháng';
                mapped.registration_date = mapped.registration_date || mapped.inspection_date;
                mapped.registration_expiry_date = mapped.registration_expiry_date || mapped.inspection_expiry_date;
                mapped.inspection_cycle = mapped.inspection_cycle || mapped.registration_cycle;
                mapped.inspection_date = mapped.inspection_date || mapped.registration_date;
                mapped.inspection_expiry_date = mapped.inspection_expiry_date || mapped.registration_expiry_date;
                mapped.engine_number = mapped.engine_number || `ENG-${mapped.vehicle_code || mapped.id || 'NA'}`;
                mapped.chassis_number = mapped.chassis_number || `CHS-${mapped.vehicle_code || mapped.id || 'NA'}`;
                mapped.current_location = mapped.current_location || 'Bãi xe TP.HCM';
                mapped.registration_cost = typeof mapped.registration_cost === 'number' ? mapped.registration_cost : 350000;
                return mapped;
            });
        }

        if (collectionName === 'drivers') {
            rows = rows.map((row: any, idx: number) => {
                const mapped = { ...row };
                mapped.date_of_birth = mapped.date_of_birth || mapped.birth_date || addDaysIso('1988-01-01', idx * 170);
                mapped.birth_date = mapped.birth_date || mapped.date_of_birth;
                mapped.contract_type = mapped.contract_type || 'toan_thoi_gian';
                mapped.license_issue_date = mapped.license_issue_date || mapped.hire_date;
                mapped.tax_code = mapped.tax_code || `0${String(100000000 + idx).slice(-9)}`;
                mapped.id_card = mapped.id_card || `0790${String(100000 + idx).padStart(6, '0')}`;
                return mapped;
            });
        }

        if (collectionName === 'routes') {
            rows = rows.map((row: any) => {
                const mapped = { ...row };
                mapped.base_price = mapped.base_price ?? mapped.standard_freight_rate ?? 0;
                mapped.cargo_weight_standard = mapped.cargo_weight_standard ?? mapped.cargo_tons ?? 0;
                mapped.transport_revenue_standard = mapped.transport_revenue_standard ?? ((mapped.cargo_weight_standard || 0) * (mapped.base_price || 0));
                mapped.driver_allowance_standard = mapped.driver_allowance_standard ?? Math.round((mapped.transport_revenue_standard || 0) * 0.08);
                mapped.support_fee_standard = mapped.support_fee_standard ?? Math.round((mapped.transport_revenue_standard || 0) * 0.03);
                mapped.police_fee_standard = mapped.police_fee_standard ?? 120000;
                mapped.fuel_liters_standard = mapped.fuel_liters_standard ?? mapped.fuel_liters ?? 0;
                mapped.fuel_cost_standard = mapped.fuel_cost_standard ?? mapped.fuel_cost ?? 0;
                mapped.tire_service_fee_standard = mapped.tire_service_fee_standard ?? 80000;
                mapped.toll_cost = mapped.toll_cost ?? 0;
                mapped.default_extra_fee = mapped.default_extra_fee ?? mapped.other_cost ?? 100000;
                mapped.total_cost_standard = mapped.total_cost_standard ?? (
                    (mapped.driver_allowance_standard || 0)
                    + (mapped.support_fee_standard || 0)
                    + (mapped.police_fee_standard || 0)
                    + (mapped.fuel_cost_standard || 0)
                    + (mapped.tire_service_fee_standard || 0)
                    + (mapped.toll_cost || 0)
                    + (mapped.default_extra_fee || 0)
                );
                mapped.profit_standard = mapped.profit_standard ?? ((mapped.transport_revenue_standard || 0) - (mapped.total_cost_standard || 0));
                return mapped;
            });
        }

        rows = rows.filter((r: any) => r.is_deleted !== 1);
        if (typeof offsetCount === 'number' && offsetCount > 0) rows = rows.slice(offsetCount);
        if (typeof limitCount === 'number' && limitCount > 0) rows = rows.slice(0, limitCount);
        return rows;
    },
    get: async (id: string) => {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().tenant_id === getTenantId()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    },
    create: async (data: any) => {
        const tenantId = getTenantId();
        enforceMutationThrottle(collectionName, 'create', undefined, data);
        
        // 1. Quota Check
        await checkQuotas(tenantId, collectionName);

        // 2. Cross Integrity Check
        try {
            await runCrossIntegrity(collectionName, data, tenantId);
        } catch (error: any) {
            throw new Error(`[${collectionName}] Lỗi Nghiệp Vụ P0: ${error.message}`);
        }

        let validatedData = data;
        try {
            validatedData = validateAdapterData(collectionName, data);
        } catch (error: any) {
            throw new Error(`[${collectionName}] ${error.message}`);
        }

        // 3. Centralized ID Sequential Generation (Làm Thật)
        let finalId = validatedData.id || validatedData['Mã xe'] || validatedData['Mã tài xế'] || validatedData['Mã KH'] || validatedData['Mã tuyến'] || validatedData['Mã chuyến'] || validatedData['Mã chi phí'] || validatedData['Mã lệnh'];
        
        if (!finalId) {
           finalId = await getNextSequentialId(tenantId, collectionName);
        }
        
        // ---- SECURITY HARDENING: Use Cloud Functions for Trips ----
        // ---- SECURITY HARDENING: Use Cloud Functions for Trips ----
        if (collectionName === 'trips') {
            try {
                const result = await callCallableWithRegionFallback('secureCreateTrip', validatedData);
                const tripId = (result.data as any).id;
                await logActivity('CREATE', 'trips', tripId, { payload: validatedData, via: 'callable' });
                return { id: tripId, ...validatedData, tenant_id: tenantId };
            } catch (error: any) {
                const errMsg = error?.message || 'Unknown error';
                console.warn(`[TRIPS] Cloud Function secureCreateTrip failed (${errMsg}). Falling back to Firestore...`);
                // Fallback to direct client-side write if Cloud Functions are not deployed or throwing internal errors locally
            }
        }
        // -----------------------------------------------------------
        // -----------------------------------------------------------

        const payload = { ...validatedData, tenant_id: tenantId, created_at: new Date().toISOString() };
        
        // --- SYNC ID FIELDS ---
        if (collectionName === 'vehicles') payload.vehicle_code = payload.vehicle_code || finalId;
        if (collectionName === 'drivers') payload.driver_code = payload.driver_code || finalId;
        if (collectionName === 'customers') payload.customer_code = payload.customer_code || finalId;
        if (collectionName === 'trips') payload.trip_code = payload.trip_code || finalId;
        if (collectionName === 'routes') payload.route_code = payload.route_code || finalId;
        if (collectionName === 'transportOrders') payload.order_code = payload.order_code || finalId;
        if (collectionName === 'expenses') payload.expense_code = payload.expense_code || finalId;
        if (collectionName === 'maintenance') payload.maintenance_code = payload.maintenance_code || finalId;

        
        // --- ATOMIC BATCH WRITE (Data + Log) ---
        const batch = writeBatch(db);
        const targetDocRef = doc(db, collectionName, finalId);
        
        batch.set(targetDocRef, payload);
        
        const logData = buildLogPayload('CREATE', collectionName, finalId, { payload });
        if (logData) {
            const logDocRef = doc(collection(db, 'system_logs'));
            batch.set(logDocRef, logData);
        }
        
        await batch.commit();
        
        // --- AUTO-SYNC TO GOOGLE DRIVE (Làm Thật) ---
        setTimeout(async () => {
            try {
                const settingsDoc = await getDoc(doc(db, 'company_settings', tenantId));
                const config = settingsDoc.data()?.gdrive_config;
                if (config?.isConnected && config?.clientId) {
                    const allData = await (createFirestoreAdapter(collectionName) as any).list();
                    await googleDriveService.syncFleetData(allData, tenantId, config.folderId);
                }
            } catch (e) {
                console.warn('Auto-sync background failure:', e);
            }
        }, 1000);

        return { id: finalId, ...payload };
    },
    update: async (id: string, data: any) => {
        enforceMutationThrottle(collectionName, 'update', id, data);
        // ---- SECURITY & LOGIC HARDENING ----
        const docRef = doc(db, collectionName, id);
        const existingDoc = await getDoc(docRef);
        if (!existingDoc.exists() || existingDoc.data()?.tenant_id !== getTenantId()) {
            throw new Error(`Unauthorized: Document ${id} does not belong to this tenant.`);
        }
        
        const oldData = existingDoc.data();
        
        // 1. Immutability Check (Closed data protection)
        if (oldData.status === 'closed' && collectionName === 'trips') {
            throw new Error("Dữ liệu đã đóng: Bản ghi này đã được quyết toán và không thể chỉnh sửa.");
        }

        // 2. State Machine Check
        if (collectionName === 'trips' && data.status) {
            checkStatusTransition(oldData.status, data.status);
            if (data.status === 'completed' && !data.completed_at && !oldData.completed_at) {
                data.completed_at = new Date().toISOString();
            }
        }
        
        // 3. Cross Integrity Check
        try {
            await runCrossIntegrity(collectionName, data, getTenantId(), { id, ...oldData });
        } catch (error: any) {
             throw new Error(`[${collectionName}] Lỗi Nghiệp Vụ P0: ${error.message}`);
        }
        // ----------------------------------------------

        let validatedData = data;
        try {
            validatedData = validateAdapterData(collectionName, { id, ...data });
            if (!data.id) delete validatedData.id;
        } catch (error: any) {
            throw new Error(`[${collectionName}] ${error.message}`);
        }
        
        // ---- SECURITY HARDENING: Use Cloud Functions for Trips ----
        if (collectionName === 'trips') {
            try {
                await callCallableWithRegionFallback('secureUpdateTrip', { id, ...validatedData });
                await logActivity('UPDATE', 'trips', id, {
                    previous: oldData,
                    changes: validatedData,
                    via: 'callable',
                });
                return true;
            } catch (error: any) {
                const errMsg = error?.message || 'Unknown error';
                console.warn(`[TRIPS] Cloud Function secureUpdateTrip failed (${errMsg}). Falling back to Firestore...`);
                // Fallback to direct client-side update if functions aren't deployed locally
            }
        }
        // -----------------------------------------------------------

        // --- ATOMIC BATCH WRITE (Data Update + Log) ---
        const batch = writeBatch(db);
        const updatePayload = { ...validatedData, updated_at: new Date().toISOString() };
        
        batch.update(docRef, updatePayload);
        
        const logData = buildLogPayload('UPDATE', collectionName, id, { 
            previous: oldData, 
            changes: validatedData 
        });
        
        if (logData) {
            const logDocRef = doc(collection(db, 'system_logs'));
            batch.set(logDocRef, logData);
        }
        
        await batch.commit();
        return true;
    },
    delete: async (id: string) => {
        enforceMutationThrottle(collectionName, 'delete', id);
        // ---- SECURITY HARDENING: PRE-CHECK TENANT ----
        const docRef = doc(db, collectionName, id);
        const existingDoc = await getDoc(docRef);
        if (!existingDoc.exists() || existingDoc.data()?.tenant_id !== getTenantId()) {
            throw new Error(`Unauthorized: Cannot delete document ${id}.`);
        }
        // ----------------------------------------------

        await deleteDoc(docRef);
        await logActivity('DELETE', collectionName, id);
        return true;
    },
    getById: async (id: string) => {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        const data: any = docSnap.data();
        if (data.tenant_id !== getTenantId() || data.is_deleted === 1) return null;
        return { id: docSnap.id, ...data };
    },
    softDelete: async (id: string) => {
        enforceMutationThrottle(collectionName, 'softDelete', id);
        const nowIso = new Date().toISOString();
        const docRef = doc(db, collectionName, id);
        
        // Security check
        const existingDoc = await getDoc(docRef);
        if (!existingDoc.exists() || existingDoc.data()?.tenant_id !== getTenantId()) {
            throw new Error("Unauthorized soft delete");
        }

        await updateDoc(docRef, {
            is_deleted: 1,
            deleted_at: nowIso,
            updated_at: nowIso,
        } as any);
        
        await logActivity('DELETE', collectionName, id, { type: 'soft' });
        return true;
    },
    listByStatus: async (status: string) => {
        const tenantId = getTenantId();
        const q = query(collection(db, collectionName), where("tenant_id", "==", tenantId), where("status", "==", status));
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((r: any) => r.is_deleted !== 1);
    },
    search: async (term: string) => {
        const all = await (createFirestoreAdapter(collectionName) as any).list();
        const q = (term || '').toLowerCase();
        if (!q) return all;
        const fields = ['id', 'name', 'vehicle_code', 'license_plate', 'driver_code', 'full_name', 'route_code', 'route_name', 'customer_code', 'customer_name', 'order_code', 'trip_code', 'expense_code', 'po_code'];
        return all.filter((row: any) => fields.some((f) => String(row?.[f] || '').toLowerCase().includes(q)));
    },
    count: async () => {
        const tenantId = getTenantId();
        const q = query(collection(db, collectionName), where("tenant_id", "==", tenantId));
        const snapshot = await getDocs(q);
        return snapshot.docs.filter((d: any) => d.data()?.is_deleted !== 1).length;
    }
});

const transportOrderFirestoreAdapter = {
    ...createFirestoreAdapter('transportOrders'),
    getStats: async () => {
        const rows = await (createFirestoreAdapter('transportOrders') as any).list();
        const byStatus: Record<string, number> = {};
        rows.forEach((r: any) => {
            byStatus[r.status || 'unknown'] = (byStatus[r.status || 'unknown'] || 0) + 1;
        });
        return {
            total: rows.length,
            byStatus,
        };
    },
    getNextCode: async () => {
        return await getNextSequentialId(getTenantId(), 'transportOrders');
    },
    // QA AUDIT FIX 1.3: All status mutations must verify tenant ownership
    confirm: async (id: string) => {
        enforceMutationThrottle('transportOrders', 'confirm', id);
        const docRef = doc(db, 'transportOrders', id);
        const snap = await getDoc(docRef);
        if (!snap.exists() || snap.data()?.tenant_id !== getTenantId()) {
            throw new Error('Unauthorized: Transport order does not belong to this tenant.');
        }
        await updateDoc(docRef, { status: 'confirmed', confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return true;
    },
    startProgress: async (id: string) => {
        enforceMutationThrottle('transportOrders', 'startProgress', id);
        const docRef = doc(db, 'transportOrders', id);
        const snap = await getDoc(docRef);
        if (!snap.exists() || snap.data()?.tenant_id !== getTenantId()) {
            throw new Error('Unauthorized: Transport order does not belong to this tenant.');
        }
        await updateDoc(docRef, { status: 'in_progress', updated_at: new Date().toISOString() });
        return true;
    },
    complete: async (id: string) => {
        enforceMutationThrottle('transportOrders', 'complete', id);
        const docRef = doc(db, 'transportOrders', id);
        const snap = await getDoc(docRef);
        if (!snap.exists() || snap.data()?.tenant_id !== getTenantId()) {
            throw new Error('Unauthorized: Transport order does not belong to this tenant.');
        }
        await updateDoc(docRef, { status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return true;
    },
    cancel: async (id: string) => {
        enforceMutationThrottle('transportOrders', 'cancel', id);
        const docRef = doc(db, 'transportOrders', id);
        const snap = await getDoc(docRef);
        if (!snap.exists() || snap.data()?.tenant_id !== getTenantId()) {
            throw new Error('Unauthorized: Transport order does not belong to this tenant.');
        }
        await updateDoc(docRef, { status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return true;
    },
};

const inventoryFirestoreAdapter = {
    ...createFirestoreAdapter('inventory'),
    listItems: async () => (createFirestoreAdapter('inventory') as any).list(),
    createItem: async (data: any) => (createFirestoreAdapter('inventory') as any).create(data),
    updateItem: async (id: string, data: any) => (createFirestoreAdapter('inventory') as any).update(id, data),
    listTransactions: async (itemId?: string) => {
        const rows = await (createFirestoreAdapter('inventoryTransactions') as any).list();
        return itemId ? rows.filter((r: any) => r.item_id === itemId) : rows;
    },
    createTransaction: async (data: any) => (createFirestoreAdapter('inventoryTransactions') as any).create(data),
    listTires: async (params?: { status?: string; vehicle_id?: string }) => {
        let rows = await (createFirestoreAdapter('tires') as any).list();
        if (params?.status) rows = rows.filter((r: any) => (r.current_status || r.status) === params.status);
        if (params?.vehicle_id) rows = rows.filter((r: any) => (r.current_vehicle_id || r.vehicle_id) === params.vehicle_id);
        return rows;
    },
    createTire: async (data: any) => (createFirestoreAdapter('tires') as any).create(data),
    updateTire: async (id: string, data: any) => (createFirestoreAdapter('tires') as any).update(id, data),
    listPOs: async () => (createFirestoreAdapter('purchaseOrders') as any).list(),
    createPO: async (data: any) => (createFirestoreAdapter('purchaseOrders') as any).create(data),
    updatePO: async (id: string, data: any) => (createFirestoreAdapter('purchaseOrders') as any).update(id, data),
};

const tiresFirestoreAdapter = {
    ...createFirestoreAdapter('tires'),
    getAll: async () => (createFirestoreAdapter('tires') as any).list(),
    install: async (tireId: string, vehicleId: string, axlePos: string, date: string, odo: number) => {
        await updateDoc(doc(db, 'tires', tireId), {
            current_status: 'INSTALLED',
            status: 'INSTALLED',
            current_vehicle_id: vehicleId,
            installed_position: axlePos,
            total_km_run: odo || 0,
            updated_at: new Date().toISOString(),
        } as any);
        return true;
    },
    remove: async (_installId: string, date: string, odo: number, reason: string) => {
        // Minimal compatibility method for offline/web parity.
        // Consumers should pass tire id in installId in this web adapter.
        await updateDoc(doc(db, 'tires', _installId), {
            current_status: 'IN_STOCK',
            status: 'IN_STOCK',
            current_vehicle_id: '',
            installed_position: '',
            total_km_run: odo || 0,
            notes: reason || `Removed at ${date}`,
            updated_at: new Date().toISOString(),
        } as any);
        return true;
    },
    getInstalledOnVehicle: async (vehicleId: string) => {
        const all = await (createFirestoreAdapter('tires') as any).list();
        return all.filter((t: any) => (t.current_vehicle_id === vehicleId) && ((t.current_status || t.status) === 'INSTALLED'));
    },
    getHistory: async (tireId: string) => {
        const t = await (createFirestoreAdapter('tires') as any).getById(tireId);
        return t ? [t] : [];
    },
};

// Implementation of Trips requires specific methods
const tripFirestoreAdapter = {
    ...createFirestoreAdapter('trips'),
    list: async (limitCount?: number, offsetCount?: number) => {
        const baseAdapter = createFirestoreAdapter('trips') as any;
        const rows = await baseAdapter.list(limitCount, offsetCount);
        return enrichTripsWithRelations(rows);
    },
    getById: async (id: string) => {
        const baseAdapter = createFirestoreAdapter('trips') as any;
        const row = await baseAdapter.getById(id);
        if (!row) return null;
        const [enriched] = await enrichTripsWithRelations([row]);
        return enriched || null;
    },
    // DEEP AUDIT FIX: Inherit route costs on creation + Backend Guards
    create: async (data: any) => {
        const tenantId = getTenantId();
        const baseAdapter = createFirestoreAdapter('trips') as any;
        
        // ===== BACKEND GUARDS (B1-B3) =====
        // Guard B1: Vehicle must be active
        if (data.vehicle_id) {
            const vSnap = await getDoc(doc(db, 'vehicles', data.vehicle_id));
            if (vSnap.exists() && vSnap.data()?.status !== 'active') {
                throw new Error(`Xe ${vSnap.data()?.license_plate || data.vehicle_id} đang ở trạng thái "${vSnap.data()?.status}". Chỉ xe Active mới được điều.`);
            }
        }
        // Guard B3: Driver must be active
        if (data.driver_id) {
            const dSnap = await getDoc(doc(db, 'drivers', data.driver_id));
            if (dSnap.exists() && dSnap.data()?.status !== 'active') {
                throw new Error(`Tài xế ${dSnap.data()?.full_name || data.driver_id} đang ở trạng thái "${dSnap.data()?.status}". Chỉ TX Active mới được nhận lệnh.`);
            }
        }
        // Guard B2: Route must be active and have costs
        if (data.route_id) {
            const rSnap = await getDoc(doc(db, 'routes', data.route_id));
            if (rSnap.exists()) {
                const routeData = rSnap.data();
                if (routeData.status === 'inactive') {
                    throw new Error(`Tuyến đường ${routeData.route_name} đã ngừng hoạt động. Không thể tạo lệnh.`);
                }
            }
        }
        // ===== END GUARDS =====
        
        // 1. Create the base trip
        const trip = await baseAdapter.create(data);
        const tripId = trip.id;

        // 2. If trip has route, auto-generate DRAFT expenses for real-time reporting
        if (data.route_id) {
            try {
                const routeSnap = await getDoc(doc(db, 'routes', data.route_id));
                if (routeSnap.exists()) {
                    const route = routeSnap.data();
                    const now = new Date();
                    const dateStr = now.toISOString().slice(0, 10);
                    
                    const standards = [
                        { cat: 'fuel', catName: 'Nhiên liệu', amt: data.estimated_fuel ?? route.fuel_cost_standard, desc: 'Định mức Dầu theo tuyến' },
                        { cat: 'toll', catName: 'Cầu đường', amt: data.estimated_toll ?? (route.toll_cost || route.toll_cost_standard), desc: 'Định mức Cầu đường theo tuyến' },
                        { cat: 'allowance', catName: 'Bồi dưỡng/Ăn uống', amt: data.estimated_allowance ?? route.driver_allowance_standard, desc: 'Định mức Bồi dưỡng theo tuyến' },
                        { cat: 'support', catName: 'Hỗ trợ', amt: route.support_fee_standard, desc: 'Phí hỗ trợ theo tuyến' },
                        { cat: 'police', catName: 'Công an', amt: route.police_fee_standard, desc: 'Phí công an theo tuyến' },
                        { cat: 'tire', catName: 'Bơm vá lốp', amt: route.tire_service_fee_standard, desc: 'Bơm vá theo tuyến' },
                        { cat: 'other', catName: 'Phí khác', amt: route.default_extra_fee, desc: 'Phí phát sinh theo tuyến' },
                    ];

                    for (const std of standards) {
                        if (std.amt && std.amt > 0) {
                            await (createFirestoreAdapter('expenses') as any).create({
                                tenant_id: tenantId,
                                amount: std.amt,
                                category_id: std.cat,
                                category: std.catName,
                                trip_id: tripId,
                                vehicle_id: data.vehicle_id || null,
                                driver_id: data.driver_id || null,
                                expense_date: dateStr,
                                description: `${std.desc} - ${data.trip_code || ''}`,
                                status: 'draft',
                                payment_method: 'CASH',
                                is_reconciled: false,
                                is_deleted: 0,
                                created_at: now.toISOString(),
                                updated_at: now.toISOString()
                            });
                        }
                    }
                    await recalculateTripExpenses(tripId, tenantId);
                }
            } catch (err: any) {
                // Don't fail trip creation if expense generation fails
                if (err?.message?.includes('đang ở trạng thái') || err?.message?.includes('ngừng hoạt động')) {
                    throw err; // Re-throw guard errors
                }
                console.error("Error creating draft expenses from route standards:", err);
            }
        }
        return trip;
    },
    // QA AUDIT FIX 1.4: All status changes must go through state machine validation
    confirm: async (id: string) => {
        enforceMutationThrottle('trips', 'confirm', id);
        const tripRef = doc(db, 'trips', id);
        const tripSnap = await getDoc(tripRef);
        if (!tripSnap.exists() || tripSnap.data()?.tenant_id !== getTenantId()) {
            throw new Error('Unauthorized: Trip does not belong to this tenant.');
        }
        checkStatusTransition(tripSnap.data().status, 'confirmed');
        await updateDoc(tripRef, { status: 'confirmed', confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return true;
    },
    dispatched: async (id: string) => {
        enforceMutationThrottle('trips', 'dispatched', id);
        const tripRef = doc(db, 'trips', id);
        const tripSnap = await getDoc(tripRef);
        if (!tripSnap.exists() || tripSnap.data()?.tenant_id !== getTenantId()) {
            throw new Error('Unauthorized: Trip does not belong to this tenant.');
        }
        checkStatusTransition(tripSnap.data().status, 'dispatched');
        await updateDoc(tripRef, { status: 'dispatched', dispatched_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return true;
    },
    // PIPELINE FIX: Formalize Truck Pickup
    pickup: async (id: string, startOdo: number) => {
        enforceMutationThrottle('trips', 'pickup', id, { startOdo });
        const tripRef = doc(db, 'trips', id);
        const tripSnap = await getDoc(tripRef);
        if (!tripSnap.exists() || tripSnap.data()?.tenant_id !== getTenantId()) {
            throw new Error('Unauthorized: Trip does not belong to this tenant.');
        }
        
        const data = tripSnap.data();
        const batch = writeBatch(db);
        
        // Record ODO and prepare for start
        batch.update(tripRef, {
            start_odometer: startOdo,
            pickup_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        // Occupy vehicle immediately upon pickup
        if (data.vehicle_id) {
            batch.update(doc(db, 'vehicles', data.vehicle_id), { status: 'on_trip' });
        }
        
        await batch.commit();
        return true;
    },
    // QA AUDIT FIX 2.4: Validate tenant + state machine before start
    start: async (id: string, time: string) => {
        enforceMutationThrottle('trips', 'start', id, { time });
        const tripRef = doc(db, 'trips', id);
        const tripSnap = await getDoc(tripRef);
        if (!tripSnap.exists() || tripSnap.data()?.tenant_id !== getTenantId()) {
            throw new Error('Unauthorized: Trip does not belong to this tenant.');
        }
        
        const data = tripSnap.data();
        // QA AUDIT: Ensure ODO was captured during pickup before starting
        if (!data.start_odometer) {
            throw new Error("Quy trình bắt buộc: Bạn phải xác nhận Nhận Xe và chốt chỉ số ODO trước khi Bắt đầu chạy.");
        }

        checkStatusTransition(data.status, 'in_progress');
        const batch = writeBatch(db);
        
        batch.update(tripRef, {
            status: 'in_progress',
            actual_departure_time: time,
            updated_at: new Date().toISOString()
        });
        
        if (data.vehicle_id) {
            const vSnap = await getDoc(doc(db, 'vehicles', data.vehicle_id));
            if (!vSnap.exists()) {
                throw new Error(`Vehicle không tồn tại: ${data.vehicle_id}`);
            }
            if (vSnap.data()?.tenant_id !== getTenantId()) {
                throw new Error(`Unauthorized: Vehicle ${data.vehicle_id} does not belong to this tenant.`);
            }
            batch.update(doc(db, 'vehicles', data.vehicle_id), { status: 'on_trip' });
        }
        if (data.driver_id) {
            const dSnap = await getDoc(doc(db, 'drivers', data.driver_id));
            if (!dSnap.exists()) {
                throw new Error(`Driver không tồn tại: ${data.driver_id}`);
            }
            if (dSnap.data()?.tenant_id !== getTenantId()) {
                throw new Error(`Unauthorized: Driver ${data.driver_id} does not belong to this tenant.`);
            }
            batch.update(doc(db, 'drivers', data.driver_id), { status: 'on_trip' });
        }
        try {
            await batch.commit();
        } catch (error: any) {
            throw new Error(`Không thể bắt đầu chuyến: ${error?.message || 'Batch update failed'}`);
        }
        return true;
    },
    complete: async (id: string, time: string, km?: number) => {
        enforceMutationThrottle('trips', 'complete', id, { time, km });
        const tripRef = doc(db, 'trips', id);
        const tripSnap = await getDoc(tripRef);
        
        if (!tripSnap.exists()) throw new Error("Chuyến đi không tồn tại.");
        const data = tripSnap.data();
        if (data.tenant_id !== getTenantId()) {
            throw new Error('Unauthorized: Trip does not belong to this tenant.');
        }
        checkStatusTransition(data.status, 'completed');

        // ---- EXPORT LOGIC: POD GUARD ----
        if (data.pod_status !== 'RECEIVED') {
            throw new Error("Quy trình bắt buộc: Bạn phải xác nhận ĐÃ NHẬN POD (Biên bản giao nhận) trước khi Hoàn Thành chuyến.");
        }
        // ---------------------------------

        const batch = writeBatch(db);
        
        batch.update(tripRef, { 
            status: 'completed', 
            actual_arrival_time: time, 
            actual_distance_km: km,
            updated_at: new Date().toISOString()
        });
        
        // Free the vehicle and driver back to active
        if (data.vehicle_id) {
            const vRef = doc(db, 'vehicles', data.vehicle_id);
            const vSnap = await getDoc(vRef);
            if (!vSnap.exists()) {
                throw new Error(`Vehicle không tồn tại: ${data.vehicle_id}`);
            }
            if (vSnap.data()?.tenant_id !== getTenantId()) {
                throw new Error(`Unauthorized: Vehicle ${data.vehicle_id} does not belong to this tenant.`);
            }
            batch.update(vRef, {
                status: 'active',
                current_odometer: (data.start_odometer || 0) + (km || 0) // Auto-update vehicle odo
            });
        }
        if (data.driver_id) {
            const dRef = doc(db, 'drivers', data.driver_id);
            const dSnap = await getDoc(dRef);
            if (!dSnap.exists()) {
                throw new Error(`Driver không tồn tại: ${data.driver_id}`);
            }
            if (dSnap.data()?.tenant_id !== getTenantId()) {
                throw new Error(`Unauthorized: Driver ${data.driver_id} does not belong to this tenant.`);
            }
            batch.update(dRef, { status: 'active' });
        }
        
        try {
            await batch.commit();
        } catch (error: any) {
            throw new Error(`Không thể hoàn thành chuyến: ${error?.message || 'Batch update failed'}`);
        }
        return true;
    },
    // QA AUDIT FIX 2.1: Comprehensive close-trip pre-conditions guard
    close: async (id: string, force?: boolean) => {
        enforceMutationThrottle('trips', 'close', id, { force });
        const tripRef = doc(db, 'trips', id);
        const tripSnap = await getDoc(tripRef);
        if (!tripSnap.exists() || tripSnap.data()?.tenant_id !== getTenantId()) {
            throw new Error('Unauthorized: Trip does not belong to this tenant.');
        }
        const tripData = tripSnap.data();
        checkStatusTransition(tripData.status, 'closed');

        if (!force) {
            // Check POD received
            if (tripData.pod_status !== 'RECEIVED') {
                throw new Error('Quy trình bắt buộc: POD (Biên bản giao nhận) chưa được xác nhận trước khi đóng chuyến.');
            }
            // AUDIT FIX C2: Check ALL linked expenses
            const tenantId = getTenantId();
            const expQ = query(collection(db, 'expenses'), where('tenant_id', '==', tenantId), where('trip_id', '==', id));
            const expSnap = await getDocs(expQ);
            // Block close if ANY draft expenses haven't been reviewed by accountant
            const draftCount = expSnap.docs.filter(d => {
                const e = d.data();
                return (e.status === 'draft' || e.status === 'pending') && !e.is_deleted;
            }).length;
            if (draftCount > 0) {
                throw new Error(`Còn ${draftCount} chi phí CHƯA ĐƯỢC KẾ TOÁN DUYỆT (draft). Kế toán phải xác nhận hoặc từ chối trước khi đóng sổ.`);
            }
            // Check reconciliation for confirmed expenses
            const unreconciledCount = expSnap.docs.filter(d => {
                const e = d.data();
                return e.status === 'confirmed' && !e.is_reconciled;
            }).length;
            if (unreconciledCount > 0) {
                throw new Error(`Còn ${unreconciledCount} chi phí đã duyệt nhưng chưa quyết toán. Vui lòng đối soát trước khi đóng chuyến.`);
            }
        }

        await updateDoc(tripRef, {
            status: 'closed',
            closed_at: new Date().toISOString(),
            closed_by: auth.currentUser?.uid || '',
            updated_at: new Date().toISOString()
        });
        await logActivity('UPDATE', 'trips', id, { action: 'CLOSE', forced: !!force });
        return true;
    },
    cancel: async (id: string) => {
        enforceMutationThrottle('trips', 'cancel', id);
        const tripRef = doc(db, 'trips', id);
        const tripSnap = await getDoc(tripRef);
        if (!tripSnap.exists()) {
            throw new Error('Chuyến đi không tồn tại.');
        }
        const data = tripSnap.data();
        if (data.tenant_id !== getTenantId()) {
            throw new Error('Unauthorized: Trip does not belong to this tenant.');
        }
        checkStatusTransition(data.status, 'cancelled');
        const batch = writeBatch(db);
        
        batch.update(tripRef, {
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        
        // Free the vehicle and driver back to active
        if (data.vehicle_id) {
            const vRef = doc(db, 'vehicles', data.vehicle_id);
            const vSnap = await getDoc(vRef);
            if (!vSnap.exists()) {
                throw new Error(`Vehicle không tồn tại: ${data.vehicle_id}`);
            }
            if (vSnap.data()?.tenant_id !== getTenantId()) {
                throw new Error(`Unauthorized: Vehicle ${data.vehicle_id} does not belong to this tenant.`);
            }
            batch.update(vRef, { status: 'active' });
        }
        if (data.driver_id) {
            const dRef = doc(db, 'drivers', data.driver_id);
            const dSnap = await getDoc(dRef);
            if (!dSnap.exists()) {
                throw new Error(`Driver không tồn tại: ${data.driver_id}`);
            }
            if (dSnap.data()?.tenant_id !== getTenantId()) {
                throw new Error(`Unauthorized: Driver ${data.driver_id} does not belong to this tenant.`);
            }
            batch.update(dRef, { status: 'active' });
        }
        try {
            await batch.commit();
        } catch (error: any) {
            throw new Error(`Không thể hủy chuyến: ${error?.message || 'Batch update failed'}`);
        }
        return true;
    },
    listByStatus: async (status: string) => {
        const tenantId = getTenantId();
        const q = query(collection(db, 'trips'), where("tenant_id", "==", tenantId), where("status", "==", status));
        const snapshot = await getDocs(q);
        const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return enrichTripsWithRelations(rows);
    },
    listByDateRange: async () => {
        // Implement full date range query if required by UI, for now fallback to standard list
        const tenantId = getTenantId();
        const q = query(collection(db, 'trips'), where("tenant_id", "==", tenantId));
        const snapshot = await getDocs(q);
        const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return enrichTripsWithRelations(rows);
    }
};

const tripLocationFirestoreAdapter = {
    ...createFirestoreAdapter('trip_location_logs'),
    listByTrip: async (tripId: string) => {
        const tenantId = getTenantId();
        const q = query(
            collection(db, 'trip_location_logs'),
            where('tenant_id', '==', tenantId),
            where('trip_id', '==', tripId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    },
    listByDriverEmail: async (driverEmail: string) => {
        const tenantId = getTenantId();
        const q = query(
            collection(db, 'trip_location_logs'),
            where('tenant_id', '==', tenantId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .filter((row: any) => row.driver_email === driverEmail);
    },
};

// AUDIT FIX C1: Separate confirmed vs estimated expenses for accurate profit
const recalculateTripExpenses = async (tripId: string, tenantId: string) => {
    if (!tripId) return;
    const q = query(
        collection(db, 'expenses'), 
        where("tenant_id", "==", tenantId), 
        where("trip_id", "==", tripId),
        where("is_deleted", "==", 0)
    );
    const snapshot = await getDocs(q);
    let confirmedExpenses = 0;  // Only accountant-approved → affects REAL profit
    let estimatedExpenses = 0;  // Draft/pending → for forecasting only
    snapshot.forEach(d => {
        const data = d.data();
        if (data.status === 'confirmed') {
            confirmedExpenses += (data.amount || 0);
        } else if (data.status === 'draft' || data.status === 'pending') {
            estimatedExpenses += (data.amount || 0);
        }
    });
    await updateDoc(doc(db, 'trips', tripId), { 
        total_expenses: confirmedExpenses,           // REAL profit calculation
        estimated_expenses: estimatedExpenses,        // For forecasting dashboard
        total_all_expenses: confirmedExpenses + estimatedExpenses, // Grand total
        updated_at: new Date().toISOString()
    });
};

// Specialized adapter for Expenses to handle Trip recalculations
const expenseFirestoreAdapter = {
    ...createFirestoreAdapter('expenses'),
    list: async (limitCount?: number, offsetCount?: number) => {
        const baseAdapter = createFirestoreAdapter('expenses') as any;
        const rows = await baseAdapter.list(limitCount, offsetCount);
        return enrichExpensesWithRelations(rows);
    },
    getById: async (id: string) => {
        const baseAdapter = createFirestoreAdapter('expenses') as any;
        const row = await baseAdapter.getById(id);
        if (!row) return null;
        const [enriched] = await enrichExpensesWithRelations([row]);
        return enriched || null;
    },
    listByTrip: async (tripId: string) => {
        const baseAdapter = createFirestoreAdapter('expenses') as any;
        const allRows = await baseAdapter.list();
        const normalizedTripId = String(tripId);
        const filtered = allRows.filter((row: any) => {
            const rowTripId = pickRefId(row, ['trip_id', 'tripId']);
            return rowTripId === normalizedTripId;
        });
        return enrichExpensesWithRelations(filtered);
    },
    create: async (data: any) => {
        enforceMutationThrottle('expenses', 'create', undefined, data);
        const baseAdapter = createFirestoreAdapter('expenses');
        
        // ---- EXPORT LOGIC: ODOMETER SYNC ----
        const isFuelOrMaint = ['Dầu', 'Nhiên liệu', 'Bảo trì', 'Sửa chữa'].some(cat => 
            (data.category || '').toLowerCase().includes(cat.toLowerCase())
        );

        if (isFuelOrMaint && data.vehicle_id && data.odometer_reading) {
            const vRef = doc(db, 'vehicles', data.vehicle_id);
            const vSnap = await getDoc(vRef);
            if (vSnap.exists()) {
                const currentOdo = vSnap.data().current_odometer || 0;
                if (data.odometer_reading < currentOdo) {
                    throw new Error(`Gian lận/Sai sót ODO: Chỉ số ODO mới (${data.odometer_reading}) không được thấp hơn ODO hiện tại của xe (${currentOdo}).`);
                }
                await updateDoc(vRef, { current_odometer: data.odometer_reading });
            }
        }
        // -------------------------------------

        const res = await baseAdapter.create(data);
        if (data.trip_id && data.status === 'confirmed') {
            await recalculateTripExpenses(data.trip_id, getTenantId());
        }
        return res;
    },
    update: async (id: string, data: any) => {
        enforceMutationThrottle('expenses', 'update', id, data);
        const baseAdapter = createFirestoreAdapter('expenses');
        const oldDoc = (await baseAdapter.get(id)) as any;
        const res = await baseAdapter.update(id, data);
        
        // If status or amount changed, or if it belongs to a trip, recalculate
        const tripId = data.trip_id || oldDoc?.trip_id;
        if (tripId && (data.status === 'confirmed' || oldDoc?.status === 'confirmed')) {
            await recalculateTripExpenses(tripId, getTenantId());
        }
        return res;
    },
    // QA AUDIT FIX 2.2: Block deletion of confirmed expenses
    delete: async (id: string) => {
        enforceMutationThrottle('expenses', 'delete', id);
        const baseAdapter = createFirestoreAdapter('expenses');
        const oldDoc = (await baseAdapter.get(id)) as any;
        if (oldDoc?.status === 'confirmed') {
            throw new Error('Không thể xóa chi phí đã xác nhận. Vui lòng hủy (cancel) chi phí trước khi xóa.');
        }
        const res = await baseAdapter.delete(id);
        if (oldDoc?.trip_id) {
            await recalculateTripExpenses(oldDoc.trip_id, getTenantId());
        }
        return res;
    },
    reject: async (id: string, reason: string) => {
        enforceMutationThrottle('expenses', 'reject', id, { reason });
        const docRef = doc(db, 'expenses', id);
        const snap = await getDoc(docRef);
        if (!snap.exists() || snap.data()?.tenant_id !== getTenantId()) {
            throw new Error('Unauthorized: Expense does not belong to this tenant.');
        }
        const data = snap.data();
        await updateDoc(docRef, { 
            status: 'rejected', 
            rejection_reason: reason,
            updated_at: new Date().toISOString() 
        });
        
        // If it was confirmed, we MUST recalculate trip expenses to reflect the removal
        if (data.trip_id && data.status === 'confirmed') {
            await recalculateTripExpenses(data.trip_id, getTenantId());
        }

        await logActivity('UPDATE', 'expenses', id, { action: 'REJECT', reason });
        return true;
    }
};

// Specialized adapter for Alerts that calculates on-the-fly anomalies
const alertsFirestoreAdapter = {
    ...createFirestoreAdapter('alerts'),
    getSummary: async () => {
        const tenantId = getTenantId();
        
        // Fetch vehicles for maintenance/insurance alerts
        const vehiclesQuery = query(collection(db, 'vehicles'), where("tenant_id", "==", tenantId));
        const vehiclesSnap = await getDocs(vehiclesQuery);
        
        // Fetch trips for financial alerts
        const tripsQuery = query(collection(db, 'trips'), where("tenant_id", "==", tenantId), where("status", "in", ["completed", "closed"]));
        const tripsSnap = await getDocs(tripsQuery);
        
        let criticalCount = 0;
        let warningCount = 0;
        const items: any[] = [];
        
        const now = new Date();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        
        // Check Vehicles
        vehiclesSnap.forEach(docSnap => {
            const v = docSnap.data();
            
            // Check missing registration
            if (!v.registration_expiry_date) {
                warningCount++;
                items.push({ id: `reg_miss_${docSnap.id}`, type: 'vehicle_missing_docs', entityName: v.license_plate, description: 'Chưa cập nhật ngày hết hạn Đăng Kiểm.', severity: 'warning', date: now.toISOString(), isRead: false });
            } else {
                const regExp = new Date(v.registration_expiry_date);
                const diff = regExp.getTime() - now.getTime();
                if (diff < 0) {
                    criticalCount++;
                    items.push({ id: `reg_exp_${docSnap.id}`, type: 'vehicle_expired', entityName: v.license_plate, description: 'Đăng kiểm ĐÃ HẾT HẠN!', severity: 'critical', date: now.toISOString(), isRead: false });
                } else if (diff < thirtyDaysMs) {
                    warningCount++;
                    items.push({ id: `reg_warn_${docSnap.id}`, type: 'vehicle_expiring', entityName: v.license_plate, description: `Đăng kiểm sắp hết hạn (${Math.ceil(diff / 86400000)} ngày).`, severity: 'warning', date: now.toISOString(), isRead: false });
                }
            }
        });
        
        // Check Trips (Negative Profit)
        tripsSnap.forEach(docSnap => {
            const t = docSnap.data();
            const rev = (t.freight_revenue || 0) + (t.additional_charges || 0);
            const exp = t.total_expenses || 0;
            const profit = rev - exp;
            
            if (profit < 0) {
                warningCount++;
                items.push({ id: `trip_prof_${docSnap.id}`, type: 'trip_low_profit', entityName: `Chuyến ${t.trip_code}`, description: `Lỗ: ${profit.toLocaleString()} đ. Doanh thu: ${rev.toLocaleString()} đ, Chi phí: ${exp.toLocaleString()} đ.`, severity: 'warning', date: t.departure_date, isRead: false });
            }
        });

        const persistedAlerts = await (createFirestoreAdapter('alerts') as any).list();
        persistedAlerts.forEach((alert: any) => {
            const severity = alert.severity === 'critical' ? 'critical' : (alert.severity === 'warning' ? 'warning' : 'info');
            if (severity === 'critical') criticalCount++;
            else if (severity === 'warning') warningCount++;

            items.push({
                id: alert.id,
                type: alert.alert_type || 'custom_alert',
                entityName: alert.title || 'Canh bao',
                description: alert.message || '',
                severity,
                date: alert.date || alert.created_at || now.toISOString(),
                isRead: !!alert.is_read,
            });
        });
        
        return {
            totalCount: criticalCount + warningCount,
            criticalCount,
            warningCount,
            infoCount: 0,
            items: items.sort((a, b) => b.severity.localeCompare(a.severity))
        };
    }
};

type TenantSeedOptions = {
    tenantId: string;
    companyName: string;
    adminUid: string;
    adminEmail: string;
    adminName: string;
};

type EnsureDemoReadinessPayload = {
    tenantId: string;
    role: string;
    email: string;
    full_name?: string;
    uid?: string;
    company_name?: string;
    force?: boolean;
};

type StartRealDataModePayload = {
    tenantId: string;
    role: string;
    keepUserId?: string;
    email?: string;
    full_name?: string;
    company_name?: string;
};

const classifyExpenseTypeByKeyword = (text: string) => {
    const s = String(text || '').toLowerCase();
    if (s.includes('dầu') || s.includes('nhiên liệu') || s.includes('xăng')) return 'Nhiên liệu';
    if (s.includes('cầu đường') || s.includes('cao tốc') || s.includes('phí đường')) return 'Cầu đường';
    if (s.includes('bốc xếp') || s.includes('nhân công')) return 'Nhân công';
    if (s.includes('bảo dưỡng') || s.includes('sửa chữa') || s.includes('lốp')) return 'Bảo dưỡng';
    return 'Khác';
};

const addDaysIso = (isoDate: string | undefined, days: number) => {
    if (!isoDate) return undefined;
    const dt = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return undefined;
    dt.setDate(dt.getDate() + days);
    return dt.toISOString().slice(0, 10);
};

const normalizeSeedRows = (rowsByCollection: Record<string, Array<Record<string, any>>>) => {
    const vehicles = rowsByCollection.vehicles || [];
    const routes = rowsByCollection.routes || [];
    const trips = rowsByCollection.trips || [];
    const expenses = rowsByCollection.expenses || [];
    const transportOrders = rowsByCollection.transportOrders || [];
    const drivers = rowsByCollection.drivers || [];

    const vehicleIds = new Set(vehicles.map((v) => String(v.id || v.vehicle_code || '')));
    const tripIds = new Set(trips.map((t) => String(t.id || t.trip_code || '')));

    vehicles.forEach((vehicle, idx) => {
        vehicle.insurance_expiry_civil = vehicle.insurance_expiry_civil || vehicle.insurance_civil_expiry || vehicle.insurance_expiry_date;
        vehicle.insurance_expiry_body = vehicle.insurance_expiry_body || vehicle.insurance_body_expiry || vehicle.insurance_expiry_date;
        vehicle.insurance_civil_expiry = vehicle.insurance_civil_expiry || vehicle.insurance_expiry_civil;
        vehicle.insurance_body_expiry = vehicle.insurance_body_expiry || vehicle.insurance_expiry_body;
        vehicle.registration_cycle = vehicle.registration_cycle || vehicle.inspection_cycle || '6 tháng';
        vehicle.inspection_cycle = vehicle.inspection_cycle || vehicle.registration_cycle;
        vehicle.registration_date = vehicle.registration_date || vehicle.inspection_date;
        vehicle.inspection_date = vehicle.inspection_date || vehicle.registration_date;
        vehicle.registration_expiry_date = vehicle.registration_expiry_date || vehicle.inspection_expiry_date;
        vehicle.inspection_expiry_date = vehicle.inspection_expiry_date || vehicle.registration_expiry_date;
        vehicle.insurance_purchase_date = vehicle.insurance_purchase_date || addDaysIso('2025-01-01', idx * 3);
        vehicle.insurance_expiry_date = vehicle.insurance_expiry_date || addDaysIso(vehicle.insurance_purchase_date, 365);
        vehicle.engine_number = vehicle.engine_number || `ENG-${vehicle.vehicle_code || vehicle.id || 'NA'}`;
        vehicle.chassis_number = vehicle.chassis_number || `CHS-${vehicle.vehicle_code || vehicle.id || 'NA'}`;
        vehicle.current_location = vehicle.current_location || 'Bãi xe chính';
    });

    drivers.forEach((driver, idx) => {
        // Use ONLY date_of_birth — no duplicate birth_date field
        driver.date_of_birth = driver.date_of_birth || addDaysIso('1988-01-01', idx * 170);
        driver.contract_type = driver.contract_type || 'toan_thoi_gian';
        driver.license_issue_date = driver.license_issue_date || driver.hire_date;
        driver.tax_code = driver.tax_code || `0${String(100000000 + idx).slice(-9)}`;
        driver.id_card = driver.id_card || `0790${String(100000 + idx).padStart(6, '0')}`;
        if (!driver.assigned_vehicle_id && vehicles.length > 0) {
            driver.assigned_vehicle_id = vehicles[idx % vehicles.length].id;
        }
    });

    routes.forEach((route) => {
        route.base_price = route.base_price ?? route.standard_freight_rate ?? 0;
        route.cargo_weight_standard = route.cargo_weight_standard ?? route.cargo_tons ?? 0;
        route.transport_revenue_standard = route.transport_revenue_standard ?? ((route.cargo_weight_standard || 0) * (route.base_price || 0));
        route.driver_allowance_standard = route.driver_allowance_standard ?? Math.round((route.transport_revenue_standard || 0) * 0.08);
        route.support_fee_standard = route.support_fee_standard ?? Math.round((route.transport_revenue_standard || 0) * 0.03);
        route.police_fee_standard = route.police_fee_standard ?? 120000;
        route.fuel_liters_standard = route.fuel_liters_standard ?? route.fuel_liters ?? 0;
        
        // AUDIT FIX: Ensure realistic profit margin (15-25%)
        const estimatedRevenue = route.transport_revenue_standard || 10000000;
        route.fuel_cost_standard = route.fuel_cost_standard ?? Math.round(estimatedRevenue * 0.35); // 35% fuel cost
        route.toll_cost = route.toll_cost ?? Math.round(estimatedRevenue * 0.10); // 10% toll
        
        route.tire_service_fee_standard = route.tire_service_fee_standard ?? 80000;
        route.default_extra_fee = route.default_extra_fee ?? route.other_cost ?? 100000;
        route.total_cost_standard = route.total_cost_standard ?? (
            (route.driver_allowance_standard || 0)
            + (route.support_fee_standard || 0)
            + (route.police_fee_standard || 0)
            + (route.fuel_cost_standard || 0)
            + (route.tire_service_fee_standard || 0)
            + (route.toll_cost || 0)
            + (route.default_extra_fee || 0)
        );
        route.profit_standard = route.profit_standard ?? ((route.transport_revenue_standard || 0) - (route.total_cost_standard || 0));
    });

    transportOrders.forEach((order) => {
        order.order_date = order.order_date || order.pickup_date || order.delivery_date;
        order.expected_delivery_date = order.expected_delivery_date || order.delivery_date || addDaysIso(order.order_date, 1);
        order.delivery_date = order.delivery_date || order.expected_delivery_date;
        order.order_value = order.order_value ?? order.total_value ?? order.freight_amount ?? 0;
        order.total_value = order.total_value ?? order.order_value ?? order.freight_amount ?? 0;
    });

    expenses.forEach((expense) => {
        if (!expense.category_name) {
            expense.category_name = classifyExpenseTypeByKeyword(`${expense.description || ''} ${expense.expense_code || ''}`);
        }
        // Relationship Audit Fix: ensure both key formats are mapped
        const vId = expense.vehicle_id || expense.vehicleId;
        if (vId && vehicleIds.has(String(vId))) {
            expense.vehicle_id = vId;
        }
        const tId = expense.trip_id || expense.tripId;
        if (tId && tripIds.has(String(tId))) {
            expense.trip_id = tId;
        }
    });

    // BUG #7 FIX: Aggregate total_expenses for each trip from linked expenses
    const expenseTotalsByTrip: Record<string, number> = {};
    expenses.forEach((e) => {
        const tid = String(e.trip_id || e.tripId || '');
        if (tid) {
            expenseTotalsByTrip[tid] = (expenseTotalsByTrip[tid] || 0) + Number(e.amount || 0);
        }
    });
    trips.forEach((trip) => {
        const tid = String(trip.id || trip.trip_code || '');
        // Force recalculation of totals for accuracy
        const tripExpenses = expenseTotalsByTrip[tid] || 0;
        
        trip.freight_revenue = Number(trip.freight_revenue || trip.total_revenue || 0);
        trip.additional_charges = Number(trip.additional_charges || 0);
        const grossRev = trip.freight_revenue + trip.additional_charges;
        
        trip.total_revenue = grossRev;
        trip.gross_revenue = grossRev;
        trip.total_expenses = tripExpenses;
        trip.total_cost = tripExpenses;
        trip.gross_profit = grossRev - tripExpenses;
    });

    // BUG #3 FIX: Supplement maintenance records if too few
    const maintenance = rowsByCollection.maintenance || [];
    if (maintenance.length < 10 && vehicles.length > 0) {
        const maintTypes = ['Bao duong dinh ky', 'Thay nhot + loc dau', 'Sua chua lon', 'Kiem tra phanh', 'Thay loc gio', 'Bao duong hop so', 'Kiem tra dien', 'Thay day curoa'];
        const baseDate = new Date();
        for (let i = maintenance.length; i < 10; i++) {
            const vehicle = vehicles[i % vehicles.length];
            const daysAgo = (10 - i) * 12;
            const mDate = new Date(baseDate.getTime() - daysAgo * 86400000);
            maintenance.push({
                id: `BT_SUP_${String(i + 1).padStart(3, '0')}`,
                vehicle_id: vehicle.id || vehicle.vehicle_code,
                maintenance_type: maintTypes[i % maintTypes.length],
                cost: 1500000 + Math.round(Math.random() * 8000000),
                currency: 'VND',
                maintenance_date: mDate.toISOString().slice(0, 10),
                odometer: 100000 + i * 15000,
                status: i < 8 ? 'completed' : 'scheduled',
                notes: `${maintTypes[i % maintTypes.length]} - ${vehicle.license_plate || vehicle.id}`,
            });
        }
        rowsByCollection.maintenance = maintenance;
    }

    // BUG #3 FIX: Supplement tire records if too few
    const tires = rowsByCollection.tires || [];
    if (tires.length < 12 && vehicles.length > 0) {
        const positions = ['Truoc-Trai', 'Truoc-Phai', 'Sau-Trai-Ngoai', 'Sau-Phai-Ngoai', 'Sau-Trai-Trong', 'Sau-Phai-Trong'];
        const brands = ['Bridgestone', 'Michelin', 'Casumina', 'DRC', 'Yokohama'];
        for (let i = tires.length; i < 12; i++) {
            const vehicle = vehicles[i % vehicles.length];
            tires.push({
                id: `TIRE_SUP_${String(i + 1).padStart(3, '0')}`,
                tire_code: `LOP-${String(i + 1).padStart(3, '0')}`,
                current_vehicle_id: vehicle.id || vehicle.vehicle_code,
                position: positions[i % positions.length],
                brand: brands[i % brands.length],
                size: '11R22.5',
                serial_number: `SN${Date.now().toString(36).toUpperCase()}${i}`,
                status: i < 10 ? 'active' : 'worn',
                install_date: addDaysIso('2025-06-01', i * 20) || '2025-06-01',
                tread_depth_mm: Math.max(2, 14 - i),
                mileage_km: 20000 + i * 8000,
                notes: `Lop ${positions[i % positions.length]} - xe ${vehicle.license_plate || vehicle.id}`,
            });
        }
        rowsByCollection.tires = tires;
    }

    // BUG #3 FIX: Supplement inventory records if too few
    const inventory = rowsByCollection.inventory || [];
    if (inventory.length < 8) {
        const items = [
            { name: 'Nhot dong co 15W-40', unit: 'Lit', qty: 200, price: 85000 },
            { name: 'Loc dau may', unit: 'Cai', qty: 50, price: 120000 },
            { name: 'Loc nhien lieu', unit: 'Cai', qty: 30, price: 95000 },
            { name: 'Loc gio', unit: 'Cai', qty: 40, price: 75000 },
            { name: 'Ma phanh', unit: 'Bo', qty: 20, price: 350000 },
            { name: 'Day curoa', unit: 'Cai', qty: 15, price: 180000 },
            { name: 'Nuoc lam mat', unit: 'Lit', qty: 100, price: 45000 },
            { name: 'Bong den pha', unit: 'Cai', qty: 25, price: 220000 },
        ];
        for (let i = inventory.length; i < 8; i++) {
            const item = items[i % items.length];
            inventory.push({
                id: `INV_SUP_${String(i + 1).padStart(3, '0')}`,
                item_code: `VT-${String(i + 1).padStart(3, '0')}`,
                item_name: item.name,
                unit: item.unit,
                quantity: item.qty,
                unit_price: item.price,
                total_value: item.qty * item.price,
                min_stock: Math.round(item.qty * 0.2),
                category: 'Phu tung',
                location: 'Kho chinh',
                status: 'in_stock',
                notes: `Vat tu ${item.name}`,
            });
        }
        rowsByCollection.inventory = inventory;
    }

    // BUG #4 FIX: Calculate accounting period revenue/expense from trips & expenses
    const accountingPeriods = rowsByCollection.accountingPeriods || [];
    if (accountingPeriods.length > 0) {
        accountingPeriods.forEach((period) => {
            const start = period.start_date;
            const end = period.end_date;
            if (!start || !end) return;

            let periodRevenue = 0;
            let periodExpense = 0;

            trips.forEach((trip) => {
                const depDate = trip.departure_date || '';
                if (depDate >= start && depDate <= end) {
                    periodRevenue += Number(trip.total_revenue || trip.freight_revenue || 0);
                    periodExpense += Number(trip.total_expenses || 0);
                }
            });

            expenses.forEach((expense) => {
                const expDate = expense.expense_date || expense.date || '';
                if (expDate >= start && expDate <= end) {
                    periodExpense += Number(expense.amount || 0);
                }
            });

            if (periodRevenue > 0) period.total_revenue = periodRevenue;
            if (periodExpense > 0) period.total_expense = periodExpense;
            period.net_profit = (period.total_revenue || 0) - (period.total_expense || 0);
        });
    }
};

const seedNewTenantDemoData = async (options: TenantSeedOptions) => {
    const { tenantId, companyName, adminUid, adminEmail, adminName } = options;
    const nowIso = new Date().toISOString();

    try {
        console.log(`🔄 [seedNewTenantDemoData] Starting demo data seed for tenant: ${tenantId}, company: ${companyName}`);

    const toDocId = (collectionName: string, sourceId: string) => {
        const cleanSourceId = String(sourceId || '').replace(/[^a-zA-Z0-9_-]/g, '');
        return `${tenantId}_${collectionName}_${cleanSourceId}`;
    };
    
    const withAudit = (row: Record<string, any>) => ({
        ...row,
        tenant_id: tenantId,
        created_at: row.created_at || nowIso,
        updated_at: row.updated_at || nowIso,
        is_deleted: typeof row.is_deleted === 'number' ? row.is_deleted : 0,
    });

    const relationMap: Record<string, string> = {
        vehicle_id: 'vehicles',
        vehicleId: 'vehicles',
        driver_id: 'drivers',
        driverId: 'drivers',
        customer_id: 'customers',
        customerId: 'customers',
        route_id: 'routes',
        routeId: 'routes',
        trip_id: 'trips',
        tripId: 'trips',
        category_id: 'expenseCategories',
        item_id: 'inventory',
        current_vehicle_id: 'vehicles',
        expense_id: 'expenses',
    };

    const resolveRef = (field: string, value: any) => {
        if (!value || typeof value !== 'string') return value;
        const targetCollection = relationMap[field];
        if (!targetCollection) return value;
        if (value.startsWith(`${tenantId}_`)) return value;
        return toDocId(targetCollection, value);
    };

    const seedRowsByCollection = Object.fromEntries(
        Object.entries(TENANT_DEMO_SEED.collections)
            .filter(([collectionName]) => collectionName !== 'users')
            .map(([collectionName, rows]) => [
                collectionName,
                (rows as unknown as Array<Record<string, any>>).map((row) => ({ ...row })),
            ])
    ) as Record<string, Array<Record<string, any>>>;

    normalizeSeedRows(seedRowsByCollection);

    // Link demo driver: for known tenants use the registered email, for new tenants generate a unique one
    const demoDriver = seedRowsByCollection.drivers?.[0];
    if (demoDriver) {
        if (tenantId === 'internal-tenant-1') {
            demoDriver.email = 'taixedemo@tnc.io.vn';
        } else if (tenantId === 'internal-tenant-phuan') {
            demoDriver.email = 'taixe1@phuancr.com';
        } else {
            // New tenant: generate a unique email so it doesn't collide with known demo accounts
            demoDriver.email = `driver1+${tenantId}@fleetpro.vn`;
        }
        demoDriver.user_id = `demo-driver-uid-${tenantId}`;
    }

    const demoDriverId = demoDriver?.id || demoDriver?.driver_code;
    const demoVehicleId = demoDriver?.assigned_vehicle_id;
    const demoTrips = seedRowsByCollection.trips || [];
    if (demoDriverId && demoTrips.length > 0) {
        // BUG #1 FIX: Assign 3 dispatched + 2 in_progress trips to demo driver
        // Pick trips with different statuses to showcase full lifecycle
        const draftOrConfirmedTrips = demoTrips.filter((t) =>
            ['draft', 'confirmed'].includes(t.status)
        );
        const inProgressTrips = demoTrips.filter((t) => t.status === 'in_progress');

        // Convert up to 3 draft/confirmed trips → dispatched for demo driver
        const toDispatch = draftOrConfirmedTrips.slice(0, 3);
        toDispatch.forEach((trip) => {
            trip.driver_id = demoDriverId;
            if (demoVehicleId) trip.vehicle_id = demoVehicleId;
            trip.status = 'dispatched';
            trip.dispatched_at = trip.dispatched_at || nowIso;
            trip.driver_name = demoDriver?.full_name || 'Demo Driver';
        });

        // Assign up to 2 in_progress trips to demo driver
        const toAssignInProgress = inProgressTrips.slice(0, 2);
        toAssignInProgress.forEach((trip) => {
            trip.driver_id = demoDriverId;
            if (demoVehicleId) trip.vehicle_id = demoVehicleId;
            trip.dispatched_at = trip.dispatched_at || nowIso;
            trip.actual_departure_time = trip.actual_departure_time || nowIso;
            trip.driver_name = demoDriver?.full_name || 'Demo Driver';
        });

        // If no draft/confirmed trips were available, forcefully set first trip
        if (toDispatch.length === 0 && demoTrips.length > 0) {
            const fallback = demoTrips[0];
            fallback.driver_id = demoDriverId;
            if (demoVehicleId) fallback.vehicle_id = demoVehicleId;
            fallback.status = 'dispatched';
            fallback.dispatched_at = fallback.dispatched_at || nowIso;
            fallback.driver_name = demoDriver?.full_name || 'Demo Driver';
        }
    }

    const allCollections = Object.entries(seedRowsByCollection).map(([collectionName, rows]) => {
        const mappedRows = rows.map((row, idx) => {
            const sourceId = String(row.id || row.record_id || `${collectionName}_${Math.random().toString(36).slice(2, 8)}`);
            const payload = { ...row };
            delete payload.id;

            Object.keys(payload).forEach((field) => {
                payload[field] = resolveRef(field, payload[field]);
            });

            if (collectionName === 'users' && payload.email && typeof payload.email === 'string') {
                const [localPart] = payload.email.split('@');
                payload.email = `${localPart}+${tenantId}@fleetpro.vn`;
                payload.company_name = companyName;
            }

            if (collectionName === 'vehicles') {
                // Trigger expiry alert on a specific vehicle by code, not fragile array index
                const EXPIRY_ALERT_VEHICLE_CODE = 'XE0003';
                if (payload.vehicle_code === EXPIRY_ALERT_VEHICLE_CODE || payload.id === EXPIRY_ALERT_VEHICLE_CODE) {
                    const soon = new Date();
                    soon.setDate(soon.getDate() + 4);
                    const soonIso = soon.toISOString().slice(0, 10);
                    payload.insurance_expiry_date = soonIso;
                    payload.registration_expiry_date = soonIso;
                    payload.inspection_expiry_date = soonIso;
                    payload.notes = '⚠️ Cần bảo trì và đăng kiểm gấp (Dữ liệu Demo thực tế)';
                }
            }

            if (collectionName === 'companySettings') {
                payload.company_name = companyName;
                payload.email = adminEmail;
                payload.subscription = {
                    plan: 'enterprise',
                    status: 'active',
                    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                };
            }

            // QA AUDIT FIX: companySettings needs special handling for Collection Name and Doc ID
            const targetCollection = collectionName === 'companySettings' ? 'company_settings' : collectionName;
            const targetDocId = collectionName === 'companySettings' ? tenantId : toDocId(collectionName, sourceId);

            return {
                docId: targetDocId,
                data: withAudit(payload),
                targetCollection,
            };
        });

        return { collectionName: mappedRows[0]?.targetCollection || collectionName, rows: mappedRows };
    });

    // QA AUDIT FIX: Atomic User Creation
    // We MUST create the admin user document FIRST and separately from the batch.
    // This satisfies the exist() check in firestore.rules for all subsequent writes in the batch.
    const adminDocData = withAudit({
        email: adminEmail,
        full_name: adminName,
        company_name: companyName,
        role: 'admin',
        status: 'active',
    });
    
    console.log(`👤 [seedNewTenantDemoData] Registering admin user document: ${adminUid}`);
    await setDoc(doc(db, 'users', adminUid), adminDocData, { merge: true });

    const writes: Array<{ collectionName: string; docId: string; data: Record<string, any> }> = [];
    allCollections.forEach(({ collectionName, rows }) => {
        // Skip 'users' collection as it's handled above atomically
        if (collectionName === 'users') return;
        
        console.log(`📦 [seedNewTenantDemoData] Preparing ${rows.length} records for collection: ${collectionName}`);
        rows.forEach((row) => writes.push({ collectionName, ...row }));
    });

    if (writes.length === 0) {
        console.warn(`⚠️ [seedNewTenantDemoData] No records to write for tenant ${tenantId}. collections found: ${allCollections.length}`);
        return;
    }

    const chunkSize = 450;
    const totalRecords = writes.length;
    
    for (let i = 0; i < writes.length; i += chunkSize) {
        const batch = writeBatch(db);
        const chunk = writes.slice(i, i + chunkSize);
        chunk.forEach(({ collectionName, docId, data }) => {
            batch.set(doc(db, collectionName, docId), data, { merge: true });
        });
        await batch.commit();
        console.log(`✅ [seedNewTenantDemoData] Batch written (${Math.min(i + chunkSize, totalRecords)}/${totalRecords})`);
    }
    
    console.log(`✅ [seedNewTenantDemoData] COMPLETE: ${totalRecords} records seeded for tenant: ${tenantId}`);
    } catch (error) {
        console.error(`❌ [seedNewTenantDemoData] FAILED for tenant ${tenantId}:`, error);
        // 🛡️ CRITICAL: Never throw — seeding failure must NEVER crash the registration flow
        return;
    }
};

const createTenantDemoAccounts = async (tenantId: string, companyName: string) => {
    await callCallableWithRegionFallback('createTenantDemoAccounts', { tenantId, companyName });
};

const isTenantDemoDataInsufficient = async (tenantId: string) => {
    const collectionsToCheck: Record<string, number> = {
        vehicles: 10,
        drivers: 10,
        trips: 20,
        expenses: 50,
        customers: 5,
        routes: 8,
    };

    for (const [collectionName, minExpected] of Object.entries(collectionsToCheck)) {
        const snapshot = await getDocs(
            query(collection(db, collectionName), where('tenant_id', '==', tenantId))
        );
        if (snapshot.size < minExpected) {
            console.log(`🚩 [Sufficiency Check] ${collectionName}: found ${snapshot.size}, expected ${minExpected}. (INSUFFICIENT)`);
            return true;
        }
    }

    console.log(`✅ [Sufficiency Check] All collections meet minimum demo requirements for ${tenantId}.`);
    return false;
};

const ensureTenantDemoReadiness = async (payload: EnsureDemoReadinessPayload) => {
    const tenantId = String(payload?.tenantId || '').trim();
    const normalizedRole = normalizeUserRole(payload?.role);

    if (!tenantId) {
        return { success: false, skipped: true, reason: 'missing_tenant' };
    }

    // Guard: Only seed for whitelisted internal tenants OR when force=true from admin
    const DEMO_TENANT_PREFIXES = ['internal-tenant-'];
    const isDemoTenant = DEMO_TENANT_PREFIXES.some(p => tenantId.startsWith(p));
    
    if (!isDemoTenant && !payload?.force) {
        return { success: true, seeded: false, skipped: true, message: 'Tài khoản thật — không cần nạp dữ liệu demo.' };
    }
    if (!isDemoTenant && payload?.force) {
        console.warn(`⚠️ [ensureTenantDemoReadiness] Manual reset requested on non-demo tenant: ${tenantId}. Proceeding...`);
    }

    const insufficient = await isTenantDemoDataInsufficient(tenantId);
    
    // Check if we need an automatic version-based update
    let versionMismatch = false;
    try {
        const tenantSnap = await getDoc(doc(db, 'tenants', tenantId));
        if (tenantSnap.exists()) {
            const currentVersion = tenantSnap.data()?.demo_data_version;
            const targetVersion = TENANT_DEMO_SEED.metadata.generated_at;
            if (!currentVersion || currentVersion !== targetVersion) {
                console.log(`🆕 [ensureTenantDemoReadiness] Version mismatch: ${currentVersion} vs ${targetVersion}. Triggering auto-reset.`);
                versionMismatch = true;
            }
        } else {
            // New tenant doc needed
            versionMismatch = true;
        }
    } catch (e) {
        console.error("Failed to check tenant version:", e);
    }

    if (!insufficient && !payload?.force && !versionMismatch) {
        return { success: true, seeded: false, message: 'Demo data already sufficient and up-to-date.' };
    }

    const user = auth.currentUser;
    if (!user) {
        return { success: false, skipped: true, reason: 'missing_auth_user' };
    }
    // FIX: Set adminUid from authenticated user BEFORE wipe so keepUserId is valid
    let adminUid = user.uid;

    if (payload?.force || versionMismatch) {
        console.log(`🧹 [ensureTenantDemoReadiness] Wipe Triggered: ${payload?.force ? 'Manual' : 'Version mismatch'}. Wiping ${tenantId}`);
        await clearTenantOperationalData({ tenantId, keepUserId: adminUid, isInternalForce: true });
    }

    const companyName = String(payload?.company_name || '').trim() || 'FleetPro Demo Company';

    // adminUid already set above from user.uid
    let adminEmail = String(payload?.email || '').trim() || user.email || '';
    let adminName = String(payload?.full_name || '').trim() || user.displayName || user.email || 'Admin';

    if (normalizedRole !== 'admin') {
        // Non-admin demo users (manager/accountant/driver) should still get full demo readiness.
        const adminSnap = await getDocs(
            query(collection(db, 'users'), where('tenant_id', '==', tenantId), where('role', '==', 'admin'))
        );

        if (adminSnap.empty) {
            return {
                success: false,
                seeded: false,
                skipped: true,
                reason: 'requires_admin',
                message: 'Tenant thiếu dữ liệu demo và không tìm thấy admin tenant để tự động khởi tạo.',
            };
        }

        const adminDoc = adminSnap.docs[0];
        const adminData: any = adminDoc.data() || {};
        adminUid = adminDoc.id;
        adminEmail = adminData.email || adminEmail;
        adminName = adminData.full_name || adminName;
    }

    await seedNewTenantDemoData({
        tenantId,
        companyName,
        adminUid,
        adminEmail,
        adminName,
    });

    if (normalizedRole === 'admin') {
        try {
            await createTenantDemoAccounts(tenantId, companyName);
        } catch (error) {
            console.warn('[ensureTenantDemoReadiness] createTenantDemoAccounts failed:', error);
        }
    }

    try {
        await setDoc(doc(db, 'tenants', tenantId), {
            demo_data_version: TENANT_DEMO_SEED.metadata.generated_at,
            updated_at: new Date().toISOString()
        }, { merge: true });
    } catch (e) {
        console.error("Failed to update tenant version:", e);
    }

    return { success: true, seeded: true, message: 'Demo data has been auto-provisioned' };
};

export const isProtectedSharedDemoTenant = (tenantId: string) => {
    if (!tenantId) return false;
    if (tenantId === 'internal-tenant-1' || tenantId === 'internal-tenant-2') return true;
    if (tenantId.startsWith('internal-tenant-')) return true;
    return false;
};

const createIsolatedTenantWorkspace = async (payload: {
    sourceTenantId: string;
    keepUserId: string;
    email?: string;
    full_name?: string;
    company_name?: string;
}) => {
    const { sourceTenantId, keepUserId } = payload;
    if (!keepUserId) {
        throw new Error('Thiếu thông tin người dùng để tạo workspace riêng.');
    }

    const shortId = Math.random().toString(36).slice(2, 10);
    const newTenantId = `tenant-${shortId}`;
    const nowIso = new Date().toISOString();

    // Try to keep company naming continuity from existing tenant settings.
    let baseCompanyName = payload.company_name || '';
    try {
        const sourceSettings = await getDocs(
            query(collection(db, 'companySettings'), where('tenant_id', '==', sourceTenantId))
        );
        if (!sourceSettings.empty) {
            const first = sourceSettings.docs[0].data() as any;
            baseCompanyName = first.company_name || first.name || baseCompanyName;
        }
    } catch (error) {
        console.warn('[createIsolatedTenantWorkspace] Cannot read source company settings:', error);
    }

    if (!baseCompanyName) {
        baseCompanyName = 'Workspace Mới Của Bạn';
    }

    const finalCompanyName = `${baseCompanyName} - Dữ liệu thật`;

    await setDoc(doc(db, 'company_settings', newTenantId), {
        company_name: finalCompanyName,
        admin_id: keepUserId,
        created_at: nowIso,
        subscription: { plan: 'trial', status: 'active' },
    }, { merge: true });

    await setDoc(doc(db, 'companySettings', `${newTenantId}_companySettings_main`), {
        tenant_id: newTenantId,
        company_name: finalCompanyName,
        email: payload.email || '',
        created_at: nowIso,
        updated_at: nowIso,
        is_deleted: 0,
    }, { merge: true });

    await setDoc(doc(db, 'users', keepUserId), {
        tenant_id: newTenantId,
        role: 'admin',
        full_name: payload.full_name || payload.email || 'Admin',
        email: payload.email || '',
        updated_at: nowIso,
    }, { merge: true });

    setRuntimeTenantId(newTenantId);

    return {
        success: true,
        migrated: true,
        newTenantId,
        message: 'Đã tách workspace riêng để nhập dữ liệu thật. Dữ liệu demo gốc vẫn giữ cho khách mới.',
    };
};

const clearTenantOperationalData = async (payload: { tenantId: string; keepUserId?: string; isInternalForce?: boolean }) => {
    const tenantId = String(payload?.tenantId || '').trim();
    const keepUserId = String(payload?.keepUserId || '').trim();

    if (!tenantId) {
        throw new Error('Thiếu tenantId để xóa dữ liệu demo.');
    }

    if (isProtectedSharedDemoTenant(tenantId) && !payload?.isInternalForce) {
        throw new Error('Tenant demo dùng chung được bảo vệ. Hãy dùng chế độ tách workspace riêng để nhập dữ liệu thật.');
    }

    const operationalCollections = [
        'vehicles',
        'drivers',
        'customers',
        'routes',
        'trips',
        'expenses',
        'transportOrders',
        'maintenance',
        'inventory',
        'inventoryTransactions',
        'tires',
        'purchaseOrders',
        'alerts',
        'trip_location_logs',
        'expenseCategories',
        'accountingPeriods',
        'partners',
        'costs',
    ];

    let deleted = 0;
    for (const collName of operationalCollections) {
        try {
            const snap = await getDocs(query(collection(db, collName), where('tenant_id', '==', tenantId)));
            if (snap.empty) continue;

            const docs = snap.docs;
            const chunkSize = 400;
            for (let i = 0; i < docs.length; i += chunkSize) {
                const batch = writeBatch(db);
                docs.slice(i, i + chunkSize).forEach((d) => batch.delete(d.ref));
                await batch.commit();
            }
            deleted += docs.length;
        } catch (err) {
            // Some collections may not exist or lack read permission — skip gracefully
            console.warn(`[clearTenantOperationalData] Skip ${collName}:`, (err as any)?.code || err);
        }
    }

    // FIX: During demo reset, preserve ALL existing tenant users.
    // Only remove non-tenant users if keepUserId is explicitly set and non-empty.
    // This prevents wiping drivers/managers who need to be able to log back in.
    if (keepUserId) {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('tenant_id', '==', tenantId)));
        if (!usersSnap.empty) {
            // Keep all users who belong to this tenant — only remove orphaned users from other tenants
            const removable = usersSnap.docs.filter((d) => d.id !== keepUserId && !d.data().tenant_id);
            if (removable.length > 0) {
                const chunkSize = 400;
                for (let i = 0; i < removable.length; i += chunkSize) {
                    const batch = writeBatch(db);
                    removable.slice(i, i + chunkSize).forEach((d) => batch.delete(d.ref));
                    await batch.commit();
                }
                deleted += removable.length;
            }
        }
    }

    return {
        success: true,
        deleted,
        message: 'Đã xóa dữ liệu demo. Bạn có thể nhập dữ liệu thật ngay trong giai đoạn dùng thử.',
    };
};

const purgeAllData = async (payload: { tenantId: string; keepUserId?: string; isInternalForce?: boolean }) => {
    return await clearTenantOperationalData(payload);
};

const startRealDataMode = async (payload: StartRealDataModePayload) => {
    const tenantId = String(payload?.tenantId || '').trim();
    const role = normalizeUserRole(payload?.role);

    if (!tenantId) {
        throw new Error('Thiếu tenantId. Vui lòng đăng nhập lại.');
    }

    if (role !== 'admin') {
        throw new Error('Chỉ admin mới có thể chuyển sang chế độ dữ liệu thật.');
    }

    if (isProtectedSharedDemoTenant(tenantId)) {
        return {
            success: false,
            error: 'Đây là tài khoản demo dùng chung. Để thử nghiệm với dữ liệu thật, vui lòng thoát ra và chọn "Tạo tài khoản mới" để nhận 14 ngày dùng thử miễn phí.',
            message: 'Vui lòng tạo tài khoản mới cho doanh nghiệp của bạn.'
        };
    }

    const cleared = await clearTenantOperationalData({
        tenantId,
        keepUserId: payload?.keepUserId,
    });

    return {
        ...cleared,
        migrated: false,
        newTenantId: tenantId,
        message: 'Đã xóa dữ liệu demo trong tenant hiện tại. Bạn có thể nhập dữ liệu thật ngay.',
    };
};

/**
 * Helper to generate sequential codes like XE0001, TX0005, etc.
 */
const generateGetNextCode = (collectionName: string, prefix: string, codeField: string, padding: number = 4) => {
    return async () => {
        try {
            const tenantId = getTenantId();
            if (!tenantId) return `${prefix}${String(1).padStart(padding, '0')}`;

            const q = query(collection(db, collectionName), where('tenant_id', '==', tenantId));
            const snap = await getDocs(q);
            if (snap.empty) return `${prefix}${String(1).padStart(padding, '0')}`;

            const maxNo = snap.docs.reduce((m: number, d: any) => {
                const data = d.data();
                const code = String(data[codeField] || '');
                const n = Number(code.replace(/\D/g, ''));
                return Number.isFinite(n) ? Math.max(m, n) : m;
            }, 0);

            return `${prefix}${String(maxNo + 1).padStart(padding, '0')}`;
        } catch (error) {
            console.error(`[getNextCode] Failed for ${collectionName}:`, error);
            return `${prefix}${String(1).padStart(padding, '0')}`;
        }
    };
};

/**
 * Web Data Access Layer - Uses Firebase Firestore
 */
const webDataAdapters: Record<string, any> = {
    vehicles: {
        ...createFirestoreAdapter('vehicles'),
        getNextCode: generateGetNextCode('vehicles', 'XE', 'vehicle_code'),
    },
    drivers: {
        ...createFirestoreAdapter('drivers'),
        getNextCode: generateGetNextCode('drivers', 'TX', 'driver_code'),
    },
    customers: {
        ...createFirestoreAdapter('customers'),
        getNextCode: generateGetNextCode('customers', 'KH', 'customer_code'),
    },
    routes: {
        ...createFirestoreAdapter('routes'),
        getNextCode: generateGetNextCode('routes', 'TD', 'route_code'),
    },
    partners: {
        ...createFirestoreAdapter('partners'),
        getNextCode: generateGetNextCode('partners', 'DT', 'partner_name'), // Some use partner_name as code or just DT prefix
    },
    trips: tripFirestoreAdapter,
    expenses: expenseFirestoreAdapter,
    maintenance: createFirestoreAdapter('maintenance'),
    tires: tiresFirestoreAdapter,
    inventory: inventoryFirestoreAdapter,
    tripLocationLogs: tripLocationFirestoreAdapter,
    transportOrders: transportOrderFirestoreAdapter,
    companySettings: {
        get: async (id?: string) => {
            const tid = id || getTenantId();
            if (!tid) return null;
            const snap = await getDoc(doc(db, 'company_settings', tid));
            return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        },
        update: async (id: string, data: any) => {
            // Super Admin can pass fixed ID, otherwise use current session tid
            const tid = id || getTenantId();
            if (!tid) throw new Error("No tenant session or ID provided");
            const docRef = doc(db, 'company_settings', tid);
            await setDoc(docRef, { 
                ...data, 
                tenant_id: tid,
                updated_at: new Date().toISOString() 
            }, { merge: true });
            await logActivity('UPDATE', 'company_settings', tid, { changes: data });
            return true;
        },
        upsert: async (data: any) => {
            // Specific for Super Admin: if data.id is provided, use it
            const tid = data.id || getTenantId();
            if (!tid) throw new Error("No tenant session or ID provided");
            const docRef = doc(db, 'company_settings', tid);
            await setDoc(docRef, { 
                ...data,
                tenant_id: tid,
                updated_at: new Date().toISOString() 
            }, { merge: true });
            return true;
        },
        create: async (data: any) => {
            const tid = data.tenant_id || getTenantId();
            if (!tid) throw new Error("No tenant context for settings creation");
            const docRef = doc(db, 'company_settings', tid);
            await setDoc(docRef, {
                ...data,
                tenant_id: tid,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { merge: true });
            return { id: tid, ...data };
        },
        list: async () => {
            const tid = getTenantId();
            if (!tid) return [];
            const snap = await getDoc(doc(db, 'company_settings', tid));
            return snap.exists() ? [{ id: snap.id, ...snap.data() }] : [];
        }
    },
    tripExpenses: createFirestoreAdapter('tripExpenses'),
    expenseCategories: createFirestoreAdapter('expenseCategories'),
    accountingPeriods: createFirestoreAdapter('accountingPeriods'),
    alerts: alertsFirestoreAdapter,
    purgeAllData,
    auth: {
        login: async (payload: { email: string; password: string }) => {
            try {
                const userCredential = await signInWithEmailAndPassword(auth, payload.email, payload.password);
                const user = userCredential.user;
                
                // Fetch user document from Firestore to get tenant_id and role.
                // Self-heal path: if users/{uid} missing, resolve by email and mirror to users/{uid}.
                let userData: any = null;
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    userData = userDoc.data();
                } else if (user.email) {
                    const userByEmail = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
                    if (!userByEmail.empty) {
                        userData = userByEmail.docs[0].data();
                        await setDoc(doc(db, 'users', user.uid), {
                            ...userData,
                            email: user.email,
                            updated_at: new Date().toISOString(),
                        }, { merge: true });
                    }
                }

                // FIX: Auto-sync predefined demo accounts to the admin's tenantId if missing or mismatched
                const demoEmails = ['quanlydemo@tnc.io.vn', 'ketoandemo@tnc.io.vn', 'taixedemo@tnc.io.vn'];
                if (user.email && demoEmails.includes(user.email)) {
                     const adminByEmail = await getDocs(query(collection(db, 'users'), where('email', '==', 'admindemo@tnc.io.vn')));
                     if (!adminByEmail.empty) {
                         const adminTenantId = adminByEmail.docs[0].data().tenant_id;
                         if (adminTenantId && (!userData || userData.tenant_id !== adminTenantId)) {
                             userData = {
                                 ...(userData || {}),
                                 tenant_id: adminTenantId,
                                 email: user.email,
                                 status: 'active'
                             };
                             if (user.email === 'ketoandemo@tnc.io.vn') userData.role = 'accountant';
                             else if (user.email === 'taixedemo@tnc.io.vn') userData.role = 'driver';
                             else if (user.email === 'quanlydemo@tnc.io.vn') userData.role = 'manager';
                             else if (!userData.role) userData.role = 'viewer';
                             
                             await setDoc(doc(db, 'users', user.uid), {
                                 ...userData,
                                 updated_at: new Date().toISOString(),
                             }, { merge: true });
                         }
                     }
                }

                if (!userData) {
                    throw new Error('User record not found in system (collection users). Contact support.');
                }

                const tenantId = userData.tenant_id;
                const role = normalizeUserRole(userData.role);
                const fullName = userData.full_name || user.email;

                if (!tenantId) {
                    throw new Error('User account is missing a tenant_id association.');
                }
                
                await logActivity('LOGIN', 'users', user.uid);

                return {
                    success: true,
                    data: {
                        user: {
                            id: user.uid,
                            email: user.email,
                            role: role,
                            full_name: fullName,
                            tenantId: tenantId
                        }
                    }
                };
            } catch (error: any) {
                // 🔴 Detailed Firebase error handling
                let errorMessage = error.message;
                
                if (error.code === 'auth/api-key-not-valid') {
                    errorMessage = '❌ Firebase API Key lỗi. Vui lòng liên hệ quản trị viên để kiểm tra cấu hình Firebase Console.\n\nThao tác:\n1. Vào https://console.firebase.google.com\n2. Project Settings → API Keys\n3. Kiểm tra API Key có hợp lệ\n4. Vào Authentication → Settings → Authorized Domains\n5. Thêm domain hiện tại vào danh sách';
                } else if (error.code === 'auth/user-not-found') {
                    errorMessage = 'Email này chưa được đăng ký trong hệ thống';
                } else if (error.code === 'auth/wrong-password') {
                    errorMessage = 'Mật khẩu không chính xác';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Định dạng email không hợp lệ';
                } else if (error.code === 'auth/user-disabled') {
                    errorMessage = 'Tài khoản này đã bị vô hiệu hóa';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = '⏸️ Quá nhiều lần đăng nhập thất bại.\n\nVui lòng chờ 5-10 phút rồi thử lại.\n\n✅ Các bước:\n1. Đợi 5-10 phút để Firebase reset\n2. Kiểm tra email/password chính xác\n3. Kiểm tra kết nối Internet\n4. Thử lại';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối Internet và thử lại';
                }
                
                console.error('🔴 Login Error:', { code: error.code, message: error.message });
                return { success: false, error: errorMessage };
            }
        },
        register: async (payload: { email: string; password: string; full_name: string; company_name: string }) => {
            try {
                // 1. Create Firebase Auth user
                const userCredential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
                const uid = userCredential.user.uid;

                // 2. Generate a unique tenant_id (standard SaaS provisioning)
                const slugifiedName = payload.company_name ? payload.company_name.toString().toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/đ/g, 'd')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '') : 'company';
                const shortId = Math.random().toString(36).substring(2, 6); // Add 4 random chars to ensure uniqueness
                const tenantId = `tenant-${slugifiedName}-${shortId}`;

                // 3. Create Firestore user document (Admin for the new tenant)
                await setDoc(doc(db, 'users', uid), {
                    email: payload.email,
                    full_name: payload.full_name,
                    company_name: payload.company_name,
                    role: 'admin',
                    tenant_id: tenantId,
                    status: 'active',
                    created_at: new Date().toISOString()
                });

                // 4. Initialize company settings
                await setDoc(doc(db, 'company_settings', tenantId), {
                    company_name: payload.company_name,
                    admin_id: uid,
                    created_at: new Date().toISOString(),
                    subscription: { 
                        plan: 'business', 
                        status: 'active',
                        trial_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year Business trial
                    }
                });

                // 5. Registration complete — No demo seeding for production stability
                // New accounts start with 100% Real Data (empty lists)
                // Users will be guided by the MenuGuide onboarding system
                
                await logActivity('CREATE', 'users', uid, { type: 'registration', company: payload.company_name });

                return { success: true, data: { uid, tenantId } };
            } catch (error: any) {
                // 🔴 Detailed Firebase error handling for registration
                let errorMessage = error.message;
                
                if (error.code === 'auth/api-key-not-valid') {
                    errorMessage = '❌ Firebase API Key lỗi. Vui lòng liên hệ quản trị viên.';
                } else if (error.code === 'auth/email-already-in-use') {
                    errorMessage = 'Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập';
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = 'Mật khẩu quá yếu. Cần ít nhất 8 ký tự với chữ hoa, chữ thường, số và ký tự đặc biệt';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Định dạng email không hợp lệ';
                } else if (error.code === 'auth/requires-recent-login') {
                    errorMessage = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối Internet và thử lại';
                }
                
                console.error('🔴 Registration Error:', { code: error.code, message: error.message });
                return { success: false, error: errorMessage };
            }
        },
        ensureTenantDemoReadiness: async (payload: EnsureDemoReadinessPayload) => {
            try {
                return await ensureTenantDemoReadiness(payload);
            } catch (error: any) {
                console.error('[auth.ensureTenantDemoReadiness] error:', error);
                return {
                    success: false,
                    seeded: false,
                    message: error?.message || 'Không thể kiểm tra/khởi tạo dữ liệu demo.',
                    error: error?.message || 'Không thể kiểm tra/khởi tạo dữ liệu demo.',
                };
            }
        },
        clearTenantOperationalData: async (payload: { tenantId: string; keepUserId?: string }) => {
            try {
                return await clearTenantOperationalData(payload);
            } catch (error: any) {
                console.error('[auth.clearTenantOperationalData] error:', error);
                return {
                    success: false,
                    deleted: 0,
                    error: error?.message || 'Không thể xóa dữ liệu demo.',
                };
            }
        },
        startRealDataMode: async (payload: StartRealDataModePayload) => {
            try {
                return await startRealDataMode(payload);
            } catch (error: any) {
                console.error('[auth.startRealDataMode] error:', error);
                return {
                    success: false,
                    migrated: false,
                    deleted: 0,
                    error: error?.message || 'Không thể chuyển sang chế độ dữ liệu thật.',
                };
            }
        },
        resetPassword: async (email: string) => {
            try {
                await sendPasswordResetEmail(auth, email);
                return { success: true };
            } catch (error: any) {
                // 🔴 Detailed Firebase error handling for password reset
                let errorMessage = error.message;
                
                if (error.code === 'auth/api-key-not-valid') {
                    errorMessage = '❌ Firebase API Key lỗi. Vui lòng liên hệ quản trị viên.';
                } else if (error.code === 'auth/user-not-found') {
                    errorMessage = 'Email này chưa được đăng ký trong hệ thống';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Định dạng email không hợp lệ';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối Internet và thử lại';
                }
                
                console.error('🔴 Password Reset Error:', { code: error.code, message: error.message });
                return { success: false, error: errorMessage };
            }
        },
        logout: async () => {
            await firebaseSignOut(auth);
            return { success: true };
        },
        listUsers: async () => {
            try {
                const tenantId = getTenantId();
                const q = query(collection(db, 'users'), where("tenant_id", "==", tenantId));
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error: any) {
                console.error("List users error:", error);
                return [];
            }
        },
        // QA AUDIT FIX 2.4: Sync permissions cho user theo role (full transport logistics)
        syncUserPermissions: async (userId: string, role: string) => {
            const permissionsByRole: Record<string, any> = {
                admin: {
                    vehicles: ['view', 'create', 'edit', 'delete', 'export'],
                    drivers: ['view', 'create', 'edit', 'delete', 'export'],
                    routes: ['view', 'create', 'edit', 'delete', 'export'],
                    customers: ['view', 'create', 'edit', 'delete', 'export'],
                    trips: ['view', 'create', 'edit', 'delete', 'lock', 'export'],
                    dispatch: ['view', 'create', 'edit', 'delete', 'export'],
                    expenses: ['view', 'create', 'edit', 'delete', 'lock', 'export'],
                    maintenance: ['view', 'create', 'edit', 'delete', 'export'],
                    reports: ['view', 'create', 'edit', 'lock', 'export'],
                    'transport-orders': ['view', 'create', 'edit', 'delete', 'lock', 'export'],
                    settings: ['view', 'create', 'edit', 'export'],
                },
                manager: {
                    vehicles: ['view', 'create', 'edit', 'delete', 'lock', 'export'],
                    drivers: ['view', 'create', 'edit', 'delete', 'lock', 'export'],
                    routes: ['view', 'create', 'edit', 'delete', 'lock', 'export'],
                    customers: ['view', 'create', 'edit', 'delete', 'lock', 'export'],
                    trips: ['view', 'create', 'edit', 'delete', 'lock', 'export'],
                    dispatch: ['view', 'create', 'edit', 'delete', 'lock', 'export'],
                    expenses: ['view', 'create', 'edit', 'delete', 'lock', 'export'],
                    maintenance: ['view', 'create', 'edit', 'delete', 'lock', 'export'],
                    reports: ['view', 'create', 'edit', 'lock', 'export'],
                    'transport-orders': ['view', 'create', 'edit', 'lock', 'export'],
                    settings: ['view', 'create', 'edit', 'export'],
                },
                // QA AUDIT FIX 2.5: Dispatcher - full logistics (xe, tài xế, tuyến, chuyến, khách, bảo trì)
                dispatcher: {
                    vehicles: ['view', 'create', 'edit', 'export'],
                    drivers: ['view', 'create', 'edit', 'export'],
                    routes: ['view', 'create', 'edit', 'export'],
                    customers: ['view', 'create', 'edit', 'export'],
                    trips: ['view', 'create', 'edit', 'export'],
                    dispatch: ['view', 'create', 'edit', 'export'],
                    maintenance: ['view', 'create', 'edit', 'export'],
                    expenses: ['view', 'export'],
                    reports: ['view', 'export'],
                    'transport-orders': ['view', 'export'],
                },
                // QA AUDIT FIX 2.6: Accountant - full finance (chi phí, báo cáo, khách hàng)
                accountant: {
                    expenses: ['view', 'create', 'edit', 'lock', 'export'],
                    reports: ['view', 'create', 'edit', 'lock', 'export'],
                    'transport-orders': ['view', 'create', 'edit', 'lock', 'export'],
                    trips: ['view', 'export'],
                    vehicles: ['view', 'export'],
                    drivers: ['view', 'export'],
                    customers: ['view', 'export'],
                },
                driver: {
                    trips: ['view', 'export'],
                    profile: ['view', 'edit'],
                },
                viewer: {
                    vehicles: ['view', 'export'],
                    drivers: ['view', 'export'],
                    routes: ['view', 'export'],
                    customers: ['view', 'export'],
                    trips: ['view', 'export'],
                    reports: ['view', 'export'],
                },
            };

            try {
                const permissions = permissionsByRole[role] || permissionsByRole['viewer'];
                await updateDoc(doc(db, 'users', userId), {
                    permissions,
                    permissions_synced_at: new Date().toISOString(),
                });
                console.log(`[QA AUDIT] Synced permissions for user ${userId} with role ${role}`);
                return true;
            } catch (error: any) {
                console.error(`[QA AUDIT] Failed to sync permissions:`, error);
                return false;
            }
        },
        createUser: async (payload: { email: string; password: string; full_name: string; role: string }) => {
            let secondaryApp;
            try {
                // Initialize secondary app to create user without signing out the admin
                secondaryApp = initializeApp(firebaseConfig, `SecondaryApp_${Date.now()}`);
                const secondaryAuth = getAuth(secondaryApp);
                
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, payload.email, payload.password);
                const newUid = userCredential.user.uid;
                
                // Immediately sign out and delete secondary app to prevent session conflicts
                await secondaryAuth.signOut();
                await deleteApp(secondaryApp);
                secondaryApp = null;
                
                // Save user metadata to Firestore main app under the users collection
                const tenantId = getTenantId();
                await setDoc(doc(db, 'users', newUid), {
                    email: payload.email,
                    full_name: payload.full_name,
                    role: payload.role || 'viewer',
                    tenant_id: tenantId,
                    status: 'active',
                    created_at: new Date().toISOString()
                });
                
                // QA AUDIT FIX 2.7: Sync permissions immediately after user creation
                const syncResult = await (authAdapter as any).syncUserPermissions(newUid, payload.role || 'viewer');
                console.log(`[QA AUDIT] User created with role=${payload.role}, permissions synced=${syncResult}`);
                
                await logActivity('CREATE', 'users', newUid, { type: 'invitation', role: payload.role, permissions_synced: syncResult });

                return { success: true, data: { id: newUid } };
            } catch (error: any) {
                if (secondaryApp) {
                    try {
                        await getAuth(secondaryApp).signOut();
                        await deleteApp(secondaryApp);
                    } catch (e) {
                        // Ignore secondary app cleanup error and return original auth error.
                    }
                }
                return { success: false, error: error.message };
            }
        },
        updateUserRole: async (userId: string, targetRole: string) => {
            try {
                await updateDoc(doc(db, 'users', userId), { role: targetRole });
                // QA AUDIT FIX 2.8: Sync permissions when role changes
                const syncResult = await (authAdapter as any).syncUserPermissions(userId, targetRole);
                console.log(`[QA AUDIT] User role changed to ${targetRole}, permissions synced=${syncResult}`);
                await logActivity('ROLE_CHANGE', 'users', userId, { newRole: targetRole, permissions_synced: syncResult });
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        deleteUser: async (userId: string) => {
            try {
                // Soft delete by removing from tenant. User can't access tenant data anymore.
                // Complete auth deletion requires Firebase Admin SDK, but this is sufficient for SaaS multi-tenancy.
                await deleteDoc(doc(db, 'users', userId));
                await logActivity('DELETE', 'users', userId, { type: 'member_removal' });
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        }
    }
};

/**
 * AdapterFactory
 * Automatically routes method calls to Web (Firebase) or Electron
 */
export class AdapterFactory {
    static getAdapter(domainName: string): any {
        return new Proxy({}, {
            get(target, prop: string) {
                if (prop === 'then') return undefined; // Avoid Promise issues
                
                return async (...args: any[]) => {
                    // Try Web/Firebase first (for online version)
                    if (isWeb()) {
                        const webAdapter = (webDataAdapters as any)[domainName];
                        if (webAdapter && typeof webAdapter[prop] === 'function') {
                            return await webAdapter[prop](...args);
                        }
                        // Fallback: return empty array for list operations
                        if (prop === 'list') return [];
                        if (prop === 'count') return 0;
                        throw new Error(`Web adapter for ${domainName}.${prop} not implemented`);
                    }

                    // Electron/Desktop fallback
                    const win = window as any;
                    if (!win.electronAPI || !win.electronAPI[domainName]) {
                        throw new Error(`Domain ${domainName} not mapped in preload.ts`);
                    }
                    const ipcDomain = win.electronAPI[domainName];
                    if (ipcDomain && typeof ipcDomain[prop] === 'function') {
                        const res = await ipcDomain[prop](...args);
                        if (res && !res.success) throw new Error(res.error || `Lỗi khi gọi ${domainName}.${prop}`);
                        if (res && res.data !== undefined) return res.data;
                        if (res && res.success) return undefined; // Return undefined for success without data
                        return res;
                    }
                    throw new Error(`Method ${prop} not found on adapter ${domainName}`);
                };
            }
        });
    }
}

// Export specific adapters using the factory
export const vehicleAdapter = AdapterFactory.getAdapter('vehicles');
export const tripAdapter = AdapterFactory.getAdapter('trips');
export const driverAdapter = AdapterFactory.getAdapter('drivers');
export const routeAdapter = AdapterFactory.getAdapter('routes');
export const customerAdapter = AdapterFactory.getAdapter('customers');
export const expenseAdapter = AdapterFactory.getAdapter('expenses');
export const maintenanceAdapter = AdapterFactory.getAdapter('maintenance');
export const transportOrderAdapter = AdapterFactory.getAdapter('transportOrders');
export const authAdapter = AdapterFactory.getAdapter('auth');
export const companySettingsAdapter = AdapterFactory.getAdapter('companySettings');
export const tripExpenseAdapter = AdapterFactory.getAdapter('tripExpenses');
export const expenseCategoryAdapter = AdapterFactory.getAdapter('expenseCategories');
export const accountingPeriodsAdapter = AdapterFactory.getAdapter('accountingPeriods');
export const alertsAdapter = AdapterFactory.getAdapter('alerts');
export const tiresAdapter = AdapterFactory.getAdapter('tires');
export const partnersAdapter = AdapterFactory.getAdapter('partners');
export const inventoryAdapter = AdapterFactory.getAdapter('inventory');
export const tripLocationAdapter = AdapterFactory.getAdapter('tripLocationLogs');

// Export all adapters as a single object for convenience
export const dataAdapter = {
    vehicles: vehicleAdapter,
    trips: tripAdapter,
    drivers: driverAdapter,
    routes: routeAdapter,
    customers: customerAdapter,
    expenses: expenseAdapter,
    maintenance: maintenanceAdapter,
    transportOrders: transportOrderAdapter,
    auth: authAdapter,
    companySettings: companySettingsAdapter,
    tripExpenses: tripExpenseAdapter,
    expenseCategories: expenseCategoryAdapter,
    accountingPeriods: accountingPeriodsAdapter,
    alerts: alertsAdapter,
    tires: tiresAdapter,
    partners: partnersAdapter,
    inventory: inventoryAdapter,
    tripLocationLogs: tripLocationAdapter,

    /**
     * SUPER-SYNC: Recalculates all financial links across the tenant.
     * Ensures Trips and Expenses are perfectly logically connected.
     */
    syncTenantOperationalData: async (tenantId: string, options?: { shiftToToday?: boolean }) => {
        const now = new Date();
        const todayIso = now.toISOString().slice(0, 10);
        
        console.log(`⚡ [Super-Sync] Synchronizing logic for tenant: ${tenantId}`);

        // 1. Fetch all Trips and Expenses
        const [tripsSnap, expensesSnap, vehiclesSnap] = await Promise.all([
            getDocs(query(collection(db, 'trips'), where('tenant_id', '==', tenantId))),
            getDocs(query(collection(db, 'expenses'), where('tenant_id', '==', tenantId))),
            getDocs(query(collection(db, 'vehicles'), where('tenant_id', '==', tenantId)))
        ]);

        const trips = tripsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const expenses = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const vehicles = vehiclesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const batch = writeBatch(db);
        let updatedCount = 0;

        // 2. Aggregate Expenses -> Trips
        const expenseTotalsByTrip: Record<string, number> = {};
        expenses.forEach((e: any) => {
            const tid = e.trip_id || e.tripId;
            if (tid) {
                expenseTotalsByTrip[tid] = (expenseTotalsByTrip[tid] || 0) + Number(e.amount || 0);
            }
        });

        // 3. Update Trips with new logic
        trips.forEach((trip: any) => {
            const expenseSum = expenseTotalsByTrip[trip.id] || 0;
            const freight = Number(trip.freight_revenue || trip.total_revenue || 0);
            const additional = Number(trip.additional_charges || 0);
            const totalRevenue = freight + additional;

            const updates: any = {
                total_expenses: expenseSum,
                total_cost: expenseSum,
                total_revenue: totalRevenue,
                gross_revenue: totalRevenue,
                gross_profit: totalRevenue - expenseSum,
                updated_at: now.toISOString()
            };

            // Option: Shift to Today for live demo "WOW"
            if (options?.shiftToToday && trip.departure_date < todayIso) {
                updates.departure_date = todayIso;
                updates.actual_departure_time = now.toISOString();
                if (trip.status === 'in_progress') {
                    updates.actual_departure_time = now.toISOString();
                }
            }

            batch.update(doc(db, 'trips', trip.id), updates);
            updatedCount++;
        });

        // 4. Update Vehicles if needed (Status check)
        vehicles.forEach((v: any) => {
            if (options?.shiftToToday && v.status === 'maintenance') {
                // Ensure maintenance still feels "Current"
                batch.update(doc(db, 'vehicles', v.id), { updated_at: now.toISOString() });
            }
        });

        await batch.commit();
        console.log(`✅ [Super-Sync] Logic synchronized for ${updatedCount} trips.`);
        return { success: true, count: updatedCount };
    }
};
