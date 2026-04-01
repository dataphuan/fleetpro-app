import { Outlet, Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Truck, Home, User, Bell } from "lucide-react";
import { PaywallGuard } from "@/components/shared/PaywallGuard";
import { normalizeUserRole } from "@/lib/rbac";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";

export function DriverLayout() {
    const { user, role, loading } = useAuth() as any;
    const location = useLocation();
    const normalizedRole = normalizeUserRole(role);

    // While loading auth state
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Require auth and specific roles
    if (!user) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    // Relaxed role check for MVP driver access
    if (!['driver', 'admin', 'manager', 'dispatcher'].includes(normalizedRole)) {
        return <Navigate to="/" replace />; // Non-drivers go to standard app
    }

    return (
        <PaywallGuard>
            <div className="flex flex-col h-screen bg-slate-100 max-w-md mx-auto relative shadow-2xl overflow-hidden">
                {/* Mobile Header */}
                <header className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center z-10">
                    <div>
                        <h1 className="font-bold text-lg leading-none tracking-tight">Cổng Tài Xế</h1>
                        <span className="text-xs opacity-80">{user?.email}</span>
                    </div>
                    <button className="relative p-2 rounded-full bg-white/10 hover:bg-white/20 transition">
                        <Bell className="w-5 h-5 text-white" />
                        <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500"></span>
                    </button>
                </header>

                <InstallAppPrompt />

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto w-full pb-20">
                    <Outlet />
                </main>

                {/* Bottom Navigation */}
                <nav className="absolute bottom-0 w-full bg-white border-t border-slate-200 flex justify-around items-center pb-safe pt-2 px-1 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                    <Link to="/driver" className={`flex flex-col items-center p-2 min-w-[72px] transition-colors ${location.pathname === '/driver' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>
                        <Home className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-medium">Việc Hôm Nay</span>
                    </Link>
                    
                    <Link to="/driver/history" className={`flex flex-col items-center p-2 min-w-[72px] transition-colors ${location.pathname === '/driver/history' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>
                        <Truck className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-medium">Lịch Sử</span>
                    </Link>

                    <Link to="/driver/profile" className={`flex flex-col items-center p-2 min-w-[72px] transition-colors ${location.pathname === '/driver/profile' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>
                        <User className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-medium">Cá Nhân</span>
                    </Link>
                </nav>

                {/* iOS safe area bottom padding helper */}
                <div className="h-safe-bottom bg-white absolute bottom-0 w-full z-10" />
            </div>
        </PaywallGuard>
    );
}
