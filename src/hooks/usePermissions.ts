import { useAuth, type UserRole } from "@/contexts/AuthContext";

/**
 * Permission matrix per role per tab
 * Defines which CRUD operations each role can perform on each tab
 */
type TabName =
    | 'vehicles' | 'drivers' | 'routes' | 'customers'
    | 'trips' | 'expenses' | 'transport-orders' | 'dispatch'
    | 'maintenance' | 'reports' | 'alerts' | 'settings' | 'profile';

interface Permissions {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canLock: boolean;     // Khóa sổ
    canExport: boolean;
}

// QA AUDIT FIX 2.1: FULL Permission Matrix cho ngành vận tải
const permissionMatrix: Record<UserRole, Record<string, Partial<Permissions>>> = {
    admin: {
        _default: { canView: true, canCreate: true, canEdit: true, canDelete: true, canLock: true, canExport: true },
    },
    manager: {
        _default: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: false },
        // Manager quản lý vận hành, không được Xóa data (để chống thất thoát) và không Export
        vehicles: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: false },
        drivers: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: false },
        routes: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: false },
        customers: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: false },
        trips: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: false },
        dispatch: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: false },
        expenses: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: false },
        maintenance: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: false },
        reports: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: false },
        alerts: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: false },
        settings: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: false },
    },
    // QA AUDIT FIX 2.2: Dispatcher FULL quyền tạo/sửa vehicles, drivers, routes, customers, trips
    // (Điều phối viên = Người quản lý thế xe, tài xế, chuyến đi - lõi của vận tải)
    dispatcher: {
        _default: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
        trips: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
        dispatch: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
        // Dispatcher CÓ QUYỀN tạo/sửa master data (xe, tài xế, tuyến, khách hàng)
        vehicles: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
        drivers: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
        routes: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
        customers: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
        maintenance: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
        // Dispatcher READ ONLY cho expenses + reports
        expenses: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: true },
        reports: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: true },
    },
    // QA AUDIT FIX 2.3: Accountant FULL quyền chi phí + báo cáo + xem chuyến
    accountant: {
        _default: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: true },
        // Accountant FULL quyền expenses + reports + lock sổ
        // Accountant FULL quyền expenses + reports + lock sổ + MASTER DATA (Xe/Tài xế/...)
        expenses: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: true },
        reports: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: true },
        'transport-orders': { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: true },
        // Accountant CÓ QUYỀN sửa Master Data theo yêu cầu (Xe, Tài xế, Tuyến, Khách hàng)
        trips: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: true },
        vehicles: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
        drivers: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
        routes: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
        customers: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
    },
    driver: {
        _default: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: false },
        // Driver chỉ xem trips + profile của họ
        trips: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: false },
        profile: { canView: true, canCreate: false, canEdit: true, canDelete: false, canLock: false, canExport: false },
    },
    viewer: {
        _default: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: false },
        // Viewer chỉ xem, không thể tạo/sửa/xóa gì cả
    },
};

const defaultPermissions: Permissions = {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canLock: false,
    canExport: false,
};

export function usePermissions(tabName?: TabName): Permissions {
    const { role, tenantId } = useAuth();

    // QA AUDIT FIX P0-SEC-04: Removed broad tenant/email bypass.
    // All tenants now follow the standard RBAC permission matrix.
    // To grant full access to specific tenants, assign 'admin' role to their users in Firestore.

    const rolePerms = permissionMatrix[role];
    if (!rolePerms) return defaultPermissions;

    // Check tab-specific first, then fall back to _default
    const tabPerms = (tabName && rolePerms[tabName]) || rolePerms._default || {};

    return {
        ...defaultPermissions,
        ...tabPerms,
    };
}
