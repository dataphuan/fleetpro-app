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

const permissionMatrix: Record<UserRole, Record<string, Partial<Permissions>>> = {
    admin: {
        _default: { canView: true, canCreate: true, canEdit: true, canDelete: true, canLock: true, canExport: true },
    },
    manager: {
        _default: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: true },
    },
    dispatcher: {
        _default: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: true },
        trips: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
        dispatch: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: false, canExport: true },
        vehicles: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: true },
        drivers: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: true },
        routes: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: true },
        customers: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: true },
    },
    accountant: {
        _default: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: true },
        expenses: { canView: true, canCreate: true, canEdit: true, canDelete: false, canLock: true, canExport: true },
        trips: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: true, canExport: true },
        reports: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: true },
        customers: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: true },
    },
    driver: {
        _default: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: false },
    },
    viewer: {
        _default: { canView: true, canCreate: false, canEdit: false, canDelete: false, canLock: false, canExport: false },
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
    const { role } = useAuth();

    const rolePerms = permissionMatrix[role];
    if (!rolePerms) return defaultPermissions;

    // Check tab-specific first, then fall back to _default
    const tabPerms = (tabName && rolePerms[tabName]) || rolePerms._default || {};

    return {
        ...defaultPermissions,
        ...tabPerms,
    };
}
