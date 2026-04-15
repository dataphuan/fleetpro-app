import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { userId, loading } = useAuth();

    // Allow bypass in DEV only if explicitly enabled
    const isDevAutoLogin = import.meta.env.MODE === 'development' && import.meta.env.VITE_DEV_AUTO_LOGIN === 'true';

    if (isDevAutoLogin) {
        return <>{children}</>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Đang kiểm tra xác thực...</p>
                </div>
            </div>
        );
    }


    // In production, require authentication — show landing page first
    if (!userId) {
        return <Navigate to="/landing" replace />;
    }

    return <>{children}</>;
};
