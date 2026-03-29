import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeUserRole } from "@/lib/rbac";

export function CustomerPortalLayout() {
    const { user, role, loading, signOut } = useAuth() as any;
    const location = useLocation();
    const normalizedRole = normalizeUserRole(role);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    // Must be viewer or higher
    if (!['viewer', 'accountant', 'manager', 'dispatcher', 'admin'].includes(normalizedRole)) {
        return <Navigate to="/" replace />; 
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Elegant Corporate Header */}
            <header className="bg-white text-slate-800 border-b shadow-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <PackageSearch className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Cổng Dịch Vụ Khách Hàng</h1>
                            <p className="text-xs text-slate-500">Đối tác: {user?.full_name || user?.email}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={signOut} className="text-slate-600 hover:text-red-600">
                        <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-7xl mx-auto">
                <Outlet />
            </main>
        </div>
    );
}
