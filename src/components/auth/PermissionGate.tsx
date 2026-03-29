import React from "react";
import { AlertCircle } from "lucide-react";
import { usePermissions, type WorkflowStatus } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";

type TabName =
    | 'vehicles' | 'drivers' | 'routes' | 'customers'
    | 'trips' | 'expenses' | 'transport-orders' | 'dispatch'
    | 'maintenance' | 'reports' | 'alerts' | 'settings' | 'profile';

interface PermissionGateProps {
    requires: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canExport' | 'canLock' | 'canApprove' | 'canReject';
    tab?: TabName;
    status?: WorkflowStatus;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showBadge?: boolean;
}

export function PermissionGate({
    requires,
    tab,
    status,
    children,
    fallback = null,
    showBadge = false,
}: PermissionGateProps) {
    const permissions = usePermissions(tab, status);
    const hasPermission = permissions[requires] as boolean;

    if (hasPermission) {
        return <>{children}</>;
    }

    if (showBadge) {
        return (
            <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-600">
                    Không đủ quyền ({requires})
                </span>
            </div>
        );
    }

    return <>{fallback}</>;
}

// Shorthand components
export function CanView({ children, tab, status }: Omit<PermissionGateProps, 'requires'> & { children: React.ReactNode }) {
    return <PermissionGate requires="canView" tab={tab} status={status}>{children}</PermissionGate>;
}

export function CanEdit({ children, tab, status }: Omit<PermissionGateProps, 'requires'> & { children: React.ReactNode }) {
    return <PermissionGate requires="canEdit" tab={tab} status={status}>{children}</PermissionGate>;
}

export function CanCreate({ children, tab, status }: Omit<PermissionGateProps, 'requires'> & { children: React.ReactNode }) {
    return <PermissionGate requires="canCreate" tab={tab} status={status}>{children}</PermissionGate>;
}

export function CanDelete({ children, tab, status }: Omit<PermissionGateProps, 'requires'> & { children: React.ReactNode }) {
    return <PermissionGate requires="canDelete" tab={tab} status={status}>{children}</PermissionGate>;
}

export function CanExport({ children, tab, status }: Omit<PermissionGateProps, 'requires'> & { children: React.ReactNode }) {
    return <PermissionGate requires="canExport" tab={tab} status={status}>{children}</PermissionGate>;
}
