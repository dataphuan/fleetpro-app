/**
 * Data Adapter Layer (Factory Pattern) - FIREBASE EDITION
 * Provides interface for data access to Firebase Firestore
 */

import { db, auth, firebaseConfig } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, addDoc, writeBatch } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { normalizeUserRole } from './rbac';
import { validateAdapterData } from './schemas';

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
};

const getTenantId = () => {
    if (runtimeTenantId) return runtimeTenantId;
    
    // Fallback dev tenant for local testing ONLY
    if (import.meta.env.MODE === 'development') {
        return import.meta.env.VITE_TENANT_ID || 'dev-tenant';
    }
    
    return ''; // No tenant = No data for security
};

/**
 * Log administrative and data mutation activities for audit readiness
 */
const logActivity = async (action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LOGIN' | 'ROLE_CHANGE', collectionName: string, entityId: string, metadata?: any) => {
    try {
        const user = auth.currentUser;
        const tenantId = getTenantId();
        if (!user || !tenantId || collectionName === 'system_logs') return;

        // Delta tracking for updates
        let delta = metadata?.changes || null;
        if (action === 'UPDATE' && metadata?.previous && metadata?.changes) {
            delta = {};
            // Capture only changed fields
            for (const key in metadata.changes) {
                if (metadata.changes[key] !== metadata.previous[key]) {
                    delta[key] = {
                        from: metadata.previous[key] ?? null,
                        to: metadata.changes[key]
                    };
                }
            }
            // If nothing changed, don't log an empty update
            if (Object.keys(delta).length === 0) return;
        }

        await addDoc(collection(db, 'system_logs'), {
            timestamp: new Date().toISOString(),
            user_id: user.uid,
            user_email: user.email,
            tenant_id: tenantId,
            action,
            collection_name: collectionName,
            entity_id: entityId,
            metadata: {
                ...metadata,
                delta
            }
        });
    } catch (e) {
        console.error("Audit Log Failure:", e);
    }
};

/**
 * SaaS Quota Enforcement
 */
const PLAN_LIMITS: Record<string, any> = {
    trial: { vehicles: 5, drivers: 5, trips_per_month: 20 },
    professional: { vehicles: 50, drivers: 50, trips_per_month: 200 },
    enterprise: { vehicles: Infinity, drivers: Infinity, trips_per_month: Infinity }
};

const checkQuotas = async (tenantId: string, collectionName: string) => {
    // 1. Get Tenant Subscription Info
    const settingsDoc = await getDoc(doc(db, 'company_settings', tenantId));
    const sub = settingsDoc.exists() ? settingsDoc.data().subscription : { plan: 'trial' };
    const plan = sub?.plan || 'trial';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;

    // 2. Map collection to quota key
    const quotaMap: Record<string, string> = {
        vehicles: 'vehicles',
        drivers: 'drivers',
        trips: 'trips_per_month'
    };

    const quotaKey = quotaMap[collectionName];
    if (!quotaKey) return; // No quota for this collection

    // 3. Count existing items (for this month if it's trips)
    const adapter = createFirestoreAdapter(collectionName);
    const count = await adapter.count();

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
        'draft': ['confirmed', 'cancelled'],
        'confirmed': ['dispatched', 'cancelled', 'draft'],
        'dispatched': ['in_progress', 'cancelled', 'confirmed'],
        'in_progress': ['completed', 'cancelled'],
        'completed': ['closed', 'cancelled']
    };

    if (!validTransitions[oldStatus]?.includes(newStatus)) {
        throw new Error(`Quy trình không hợp lệ: Không thể chuyển từ [${oldStatus}] sang [${newStatus}].`);
    }
};

const createFirestoreAdapter = (collectionName: string) => ({
    list: async (limitCount?: number, offsetCount?: number) => {
        const tenantId = getTenantId();
        const q = query(collection(db, collectionName), where("tenant_id", "==", tenantId));
        const snapshot = await getDocs(q);
        let rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        
        // 1. Quota Check
        await checkQuotas(tenantId, collectionName);

        let validatedData = data;
        try {
            validatedData = validateAdapterData(collectionName, data);
        } catch (error: any) {
            throw new Error(`[${collectionName}] ${error.message}`);
        }

        // Use provided id (e.g., Mã xe) if available, otherwise let Firestore auto-generate
        const documentId = validatedData.id || validatedData['Mã xe'] || validatedData['Mã tài xế'] || validatedData['Mã KH'] || validatedData['Mã tuyến'] || validatedData['Mã chuyến'] || validatedData['Mã chi phí'] || validatedData['Mã lệnh'];
        
        const payload = { ...validatedData, tenant_id: tenantId, created_at: new Date().toISOString() };
        
        if (documentId) {
            await setDoc(doc(db, collectionName, documentId), payload);
            await logActivity('CREATE', collectionName, documentId, { payload });
            return { id: documentId, ...payload };
        } else {
            const docRef = await addDoc(collection(db, collectionName), payload);
            await logActivity('CREATE', collectionName, docRef.id, { payload });
            return { id: docRef.id, ...payload };
        }
    },
    update: async (id: string, data: any) => {
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
        }
        // ----------------------------------------------

        let validatedData = data;
        try {
            validatedData = validateAdapterData(collectionName, { id, ...data });
            if (!data.id) delete validatedData.id;
        } catch (error: any) {
            throw new Error(`[${collectionName}] ${error.message}`);
        }
        
        await updateDoc(docRef, { ...validatedData, updated_at: new Date().toISOString() });
        await logActivity('UPDATE', collectionName, id, { 
            previous: oldData, 
            changes: validatedData 
        });
        return true;
    },
    delete: async (id: string) => {
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
        const rows = await (createFirestoreAdapter('transportOrders') as any).list();
        const maxNo = rows.reduce((m: number, r: any) => {
            const n = Number(String(r.order_code || '').replace(/\D/g, ''));
            return Number.isFinite(n) ? Math.max(m, n) : m;
        }, 0);
        return `DH${String(maxNo + 1).padStart(8, '0')}`;
    },
    confirm: async (id: string) => {
        await updateDoc(doc(db, 'transportOrders', id), { status: 'confirmed', confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return true;
    },
    startProgress: async (id: string) => {
        await updateDoc(doc(db, 'transportOrders', id), { status: 'in_progress', updated_at: new Date().toISOString() });
        return true;
    },
    complete: async (id: string) => {
        await updateDoc(doc(db, 'transportOrders', id), { status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return true;
    },
    cancel: async (id: string) => {
        await updateDoc(doc(db, 'transportOrders', id), { status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() });
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
    confirm: async (id: string) => {
        await updateDoc(doc(db, 'trips', id), { status: 'confirmed', updated_at: new Date().toISOString() });
        return true;
    },
    dispatched: async (id: string) => {
        await updateDoc(doc(db, 'trips', id), { status: 'dispatched', dispatched_at: new Date().toISOString() });
        return true;
    },
    start: async (id: string, time: string) => {
        const tripRef = doc(db, 'trips', id);
        const tripSnap = await getDoc(tripRef);
        const batch = writeBatch(db);
        
        batch.update(tripRef, { status: 'in_progress', actual_departure_time: time });
        
        if (tripSnap.exists()) {
            const data = tripSnap.data();
            if (data.vehicle_id) batch.update(doc(db, 'vehicles', data.vehicle_id), { status: 'on_trip' });
            if (data.driver_id) batch.update(doc(db, 'drivers', data.driver_id), { status: 'on_trip' });
        }
        await batch.commit();
        return true;
    },
    complete: async (id: string, time: string, km?: number) => {
        const tripRef = doc(db, 'trips', id);
        const tripSnap = await getDoc(tripRef);
        
        if (!tripSnap.exists()) throw new Error("Chuyến đi không tồn tại.");
        const data = tripSnap.data();

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
            batch.update(doc(db, 'vehicles', data.vehicle_id), { 
                status: 'active',
                current_odometer: (data.start_odometer || 0) + (km || 0) // Auto-update vehicle odo
            });
        }
        if (data.driver_id) batch.update(doc(db, 'drivers', data.driver_id), { status: 'active' });
        
        await batch.commit();
        return true;
    },
    close: async (id: string, force?: boolean) => {
        await updateDoc(doc(db, 'trips', id), { status: 'closed', updated_at: new Date().toISOString() });
        return true;
    },
    cancel: async (id: string) => {
        const tripRef = doc(db, 'trips', id);
        const tripSnap = await getDoc(tripRef);
        const batch = writeBatch(db);
        
        batch.update(tripRef, { status: 'cancelled', cancelled_at: new Date().toISOString() });
        
        if (tripSnap.exists()) {
            const data = tripSnap.data();
            // Free the vehicle and driver back to active
            if (data.vehicle_id) batch.update(doc(db, 'vehicles', data.vehicle_id), { status: 'active' });
            if (data.driver_id) batch.update(doc(db, 'drivers', data.driver_id), { status: 'active' });
        }
        await batch.commit();
        return true;
    },
    listByStatus: async (status: string) => {
        const tenantId = getTenantId();
        const q = query(collection(db, 'trips'), where("tenant_id", "==", tenantId), where("status", "==", status));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    listByDateRange: async () => {
        // Implement full date range query if required by UI, for now fallback to standard list
        const tenantId = getTenantId();
        const q = query(collection(db, 'trips'), where("tenant_id", "==", tenantId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};

// Helper function to recalculate trip expenses
const recalculateTripExpenses = async (tripId: string, tenantId: string) => {
    if (!tripId) return;
    const q = query(collection(db, 'expenses'), where("tenant_id", "==", tenantId), where("trip_id", "==", tripId), where("status", "==", "confirmed"));
    const snapshot = await getDocs(q);
    let totalExpenses = 0;
    snapshot.forEach(doc => {
        totalExpenses += (doc.data().amount || 0);
    });
    // Write the aggregated sum back to the trip
    await updateDoc(doc(db, 'trips', tripId), { total_expenses: totalExpenses });
};

// Specialized adapter for Expenses to handle Trip recalculations
const expenseFirestoreAdapter = {
    ...createFirestoreAdapter('expenses'),
    create: async (data: any) => {
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
    delete: async (id: string) => {
        const baseAdapter = createFirestoreAdapter('expenses');
        const oldDoc = (await baseAdapter.get(id)) as any;
        const res = await baseAdapter.delete(id);
        if (oldDoc?.trip_id && oldDoc?.status === 'confirmed') {
            await recalculateTripExpenses(oldDoc.trip_id, getTenantId());
        }
        return res;
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
        
        return {
            totalCount: criticalCount + warningCount,
            criticalCount,
            warningCount,
            infoCount: 0,
            items: items.sort((a, b) => b.severity.localeCompare(a.severity))
        };
    }
};

/**
 * Web Data Access Layer - Uses Firebase Firestore
 */
const webDataAdapters: Record<string, any> = {
    vehicles: createFirestoreAdapter('vehicles'),
    drivers: createFirestoreAdapter('drivers'),
    customers: createFirestoreAdapter('customers'),
    routes: createFirestoreAdapter('routes'),
    trips: tripFirestoreAdapter,
    expenses: expenseFirestoreAdapter,
    maintenance: createFirestoreAdapter('maintenance'),
    tires: tiresFirestoreAdapter,
    partners: createFirestoreAdapter('partners'),
    inventory: inventoryFirestoreAdapter,
    transportOrders: transportOrderFirestoreAdapter,
    companySettings: createFirestoreAdapter('companySettings'),
    tripExpenses: createFirestoreAdapter('tripExpenses'),
    expenseCategories: createFirestoreAdapter('expenseCategories'),
    accountingPeriods: createFirestoreAdapter('accountingPeriods'),
    alerts: alertsFirestoreAdapter,
    auth: {
        login: async (payload: { email: string; password: string }) => {
            try {
                const userCredential = await signInWithEmailAndPassword(auth, payload.email, payload.password);
                const user = userCredential.user;
                
                // Fetch user document from Firestore to get tenant_id and role
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    throw new Error('User record not found in system (collection users). Contact support.');
                }
                
                const userData = userDoc.data();
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
                return { success: false, error: error.message };
            }
        },
        register: async (payload: { email: string; password: string; full_name: string; company_name: string }) => {
            try {
                // 1. Create Firebase Auth user
                const userCredential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
                const uid = userCredential.user.uid;

                // 2. Generate a unique tenant_id (standard SaaS provisioning)
                const shortId = Math.random().toString(36).substring(2, 10);
                const tenantId = `tenant-${shortId}`;

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
                    subscription: { plan: 'trial', status: 'active' }
                });
                
                await logActivity('CREATE', 'users', uid, { type: 'registration', company: payload.company_name });

                return { success: true, data: { uid, tenantId } };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        resetPassword: async (email: string) => {
            try {
                await sendPasswordResetEmail(auth, email);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
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
                
                await logActivity('CREATE', 'users', newUid, { type: 'invitation', role: payload.role });

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
                await logActivity('ROLE_CHANGE', 'users', userId, { newRole: targetRole });
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
};
