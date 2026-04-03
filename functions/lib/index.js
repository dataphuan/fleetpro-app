"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenantDemoAccounts = exports.secureUpdateTrip = exports.secureCreateTrip = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const callableRegion = functions.region('asia-southeast1');
async function resolveTenantIdFromContext(context) {
    if (!context?.auth?.uid) {
        throw new functions.https.HttpsError("unauthenticated", "Yêu cầu đăng nhập.");
    }
    const uid = context.auth.uid;
    const directSnap = await db.collection("users").doc(uid).get();
    if (directSnap.exists) {
        const directTenantId = String(directSnap.data()?.tenant_id || "").trim();
        if (directTenantId)
            return directTenantId;
    }
    const email = String(context.auth.token?.email || "").trim().toLowerCase();
    if (!email) {
        throw new functions.https.HttpsError("permission-denied", "Người dùng không thuộc tenant nào.");
    }
    const byEmailSnap = await db.collection("users").where("email", "==", email).limit(1).get();
    if (byEmailSnap.empty) {
        throw new functions.https.HttpsError("permission-denied", "Người dùng không thuộc tenant nào.");
    }
    const data = byEmailSnap.docs[0].data() || {};
    const tenantId = String(data.tenant_id || "").trim();
    if (!tenantId) {
        throw new functions.https.HttpsError("permission-denied", "Người dùng không thuộc tenant nào.");
    }
    // Self-heal by creating users/{uid} for future direct lookups.
    await db.collection("users").doc(uid).set({
        ...data,
        email,
        updated_at: new Date().toISOString(),
    }, { merge: true });
    return tenantId;
}
/**
 * R47: Kiểm tra giấy phép lái xe và trạng thái tài xế
 */
async function validateDriver(driverId, tenantId) {
    const dSnap = await db.collection("drivers").doc(driverId).get();
    if (!dSnap.exists)
        throw new functions.https.HttpsError("not-found", "Không tìm thấy tài xế.");
    const driver = dSnap.data();
    if (driver?.tenant_id !== tenantId)
        throw new functions.https.HttpsError("permission-denied", "Tài xế không thuộc công ty này.");
    if (driver?.status === "inactive")
        throw new functions.https.HttpsError("failed-precondition", "Tài xế đang ngưng hoạt động.");
    if (driver?.license_expiry_date && new Date(driver.license_expiry_date) < new Date()) {
        throw new functions.https.HttpsError("failed-precondition", "Giấy phép lái xe đã hết hạn.");
    }
    return driver;
}
/**
 * R46: Kiểm tra bảo trì định kỳ cho xe
 */
async function validateVehicle(vehicleId, tenantId, isOperational) {
    const vSnap = await db.collection("vehicles").doc(vehicleId).get();
    if (!vSnap.exists)
        throw new functions.https.HttpsError("not-found", "Không tìm thấy xe.");
    const vehicle = vSnap.data();
    if (vehicle?.tenant_id !== tenantId)
        throw new functions.https.HttpsError("permission-denied", "Xe không thuộc công ty này.");
    if (isOperational) {
        const currentOdo = vehicle?.current_odometer || 0;
        const nextMaint = vehicle?.next_maintenance_odometer || 0;
        if (nextMaint > 0 && currentOdo >= nextMaint) {
            throw new functions.https.HttpsError("failed-precondition", `Xe ${vehicle?.license_plate} đã quá hạn bảo trì.`);
        }
    }
    return vehicle;
}
/**
 * R18 & R19: Kiểm tra trùng chuyến
 */
async function checkOverlap(tripId, vehicleId, driverId, tenantId) {
    const snap = await db.collection("trips")
        .where("tenant_id", "==", tenantId)
        .where("status", "in", ["dispatched", "in_progress"])
        .get();
    for (const doc of snap.docs) {
        if (doc.id === tripId)
            continue;
        const trip = doc.data();
        if (trip.vehicle_id === vehicleId)
            throw new functions.https.HttpsError("already-exists", "Xe đang bận ở một chuyến khác.");
        if (trip.driver_id === driverId)
            throw new functions.https.HttpsError("already-exists", "Tài xế đang bận ở một chuyến khác.");
    }
}
/**
 * TẠO CHUYẾN ĐI (Server-side Secure)
 */
exports.secureCreateTrip = callableRegion.https.onCall(async (data, context) => {
    const tenantId = await resolveTenantIdFromContext(context);
    const isOperational = data.status && !["draft", "cancelled"].includes(data.status);
    // Business Rules Validation
    if (data.vehicle_id)
        await validateVehicle(data.vehicle_id, tenantId, isOperational);
    if (data.driver_id)
        await validateDriver(data.driver_id, tenantId);
    if (isOperational && data.vehicle_id && data.driver_id) {
        await checkOverlap(undefined, data.vehicle_id, data.driver_id, tenantId);
    }
    // Auto-calculation P&L (R32, R34, R35)
    const rev = Number(data.freight_revenue || 0) + Number(data.actual_revenue || 0) + Number(data.additional_charges || 0);
    const cost = Number(data.fuel_cost || 0) + Number(data.driver_advance || 0) + Number(data.toll_cost || 0);
    const payload = {
        ...data,
        tenant_id: tenantId,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        gross_revenue: rev,
        total_cost: cost,
        gross_profit: rev - cost,
    };
    const docRef = await db.collection("trips").add(payload);
    return { id: docRef.id };
});
/**
 * CẬP NHẬT CHUYẾN ĐI (Server-side Secure)
 */
exports.secureUpdateTrip = callableRegion.https.onCall(async (data, context) => {
    const { id, ...updates } = data;
    if (!id)
        throw new functions.https.HttpsError("invalid-argument", "Thiếu Trip ID.");
    const tripRef = db.collection("trips").doc(id);
    const tripSnap = await tripRef.get();
    if (!tripSnap.exists)
        throw new functions.https.HttpsError("not-found", "Không thấy chuyến đi.");
    const oldData = tripSnap.data();
    const tenantId = await resolveTenantIdFromContext(context);
    if (oldData.tenant_id !== tenantId)
        throw new functions.https.HttpsError("permission-denied", "Truy cập bị từ chối.");
    // Immutability Check (R44)
    if (oldData.status === "closed")
        throw new functions.https.HttpsError("failed-precondition", "Chuyến đi đã chốt quyết toán.");
    const isOperational = updates.status && !["draft", "cancelled"].includes(updates.status);
    // Cross-entity validation
    if (updates.vehicle_id)
        await validateVehicle(updates.vehicle_id, tenantId, isOperational);
    if (updates.driver_id)
        await validateDriver(updates.driver_id, tenantId);
    if (isOperational && (updates.vehicle_id || updates.driver_id)) {
        await checkOverlap(id, updates.vehicle_id || oldData.vehicle_id, updates.driver_id || oldData.driver_id, tenantId);
    }
    // Final Payload
    const finalData = { ...updates, updated_at: admin.firestore.FieldValue.serverTimestamp() };
    // Recalculate P&L if financial fields changed
    if (updates.freight_revenue !== undefined || updates.fuel_cost !== undefined) {
        const rev = Number(updates.freight_revenue ?? oldData.freight_revenue ?? 0) + Number(updates.actual_revenue ?? oldData.actual_revenue ?? 0);
        const cost = Number(updates.fuel_cost ?? oldData.fuel_cost ?? 0) + Number(updates.driver_advance ?? oldData.driver_advance ?? 0);
        finalData.gross_revenue = rev;
        finalData.total_cost = cost;
        finalData.gross_profit = rev - cost;
    }
    await tripRef.update(finalData);
    return { success: true };
});
exports.createTenantDemoAccounts = callableRegion.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Yêu cầu đăng nhập.");
    }
    const tenantId = String(data?.tenantId || '').trim();
    const companyName = String(data?.companyName || '').trim();
    if (!tenantId || !companyName) {
        throw new functions.https.HttpsError("invalid-argument", "Thiếu tenantId hoặc companyName.");
    }
    const requesterSnap = await db.collection("users").doc(context.auth.uid).get();
    if (!requesterSnap.exists) {
        throw new functions.https.HttpsError("permission-denied", "Không tìm thấy người dùng.");
    }
    const requester = requesterSnap.data() || {};
    if (requester.tenant_id !== tenantId || requester.role !== 'admin') {
        throw new functions.https.HttpsError("permission-denied", "Chỉ admin của tenant mới được tạo tài khoản demo.");
    }
    const demoPassword = "Demo@1234";
    const roles = [
        { role: 'manager', localPart: 'demo.manager', fullName: 'Demo Manager' },
        { role: 'dispatcher', localPart: 'demo.dispatcher', fullName: 'Demo Dispatcher' },
        { role: 'accountant', localPart: 'demo.accountant', fullName: 'Demo Accountant' },
        { role: 'driver', localPart: 'demo.driver', fullName: 'Demo Driver' },
    ];
    const results = [];
    for (const item of roles) {
        const email = `${item.localPart}+${tenantId}@fleetpro.vn`;
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
        }
        catch (error) {
            if (error?.code !== 'auth/user-not-found') {
                throw new functions.https.HttpsError("internal", "Không thể kiểm tra tài khoản demo.");
            }
            userRecord = await admin.auth().createUser({
                email,
                password: demoPassword,
                displayName: item.fullName,
            });
        }
        await db.collection('users').doc(userRecord.uid).set({
            email,
            full_name: item.fullName,
            company_name: companyName,
            role: item.role,
            tenant_id: tenantId,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }, { merge: true });
        results.push({ role: item.role, email, uid: userRecord.uid });
    }
    return { success: true, accounts: results, password: demoPassword };
});
//# sourceMappingURL=index.js.map