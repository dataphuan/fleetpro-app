import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User } from "@/shared/types/domain";

import { UserRole } from "@/shared/types/domain";
import { normalizeUserRole } from "@/lib/rbac";
export type { UserRole };

interface AuthContextType {
    user: User | null;
    role: UserRole;
    userId: string | null;
    tenantId: string | null;
    signOut: () => void;
    refreshAuth: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: 'viewer',
    userId: null,
    tenantId: null,
    signOut: () => { },
    refreshAuth: async () => { },
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [role, setRole] = useState<UserRole>('viewer'); // SECURE DEFAULT
    const [loading, setLoading] = useState(true);

    const initAuth = useCallback(async () => {
        setLoading(true);
        try {
            // Dev mode auto-login
            if (import.meta.env.MODE === 'development' && import.meta.env.VITE_DEV_AUTO_LOGIN === 'true') {
                setUserId('dev-admin');
                setRole('admin');
                setTenantId('dev-tenant');
                setUser({
                    id: 'dev-admin',
                    email: 'admin@dev.local',
                    password_hash: '',
                    full_name: 'Quản trị viên phát triển',
                    role: 'admin',
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
                setLoading(false);
                return;
            }

            // Online Session Management
            const sessionStr = localStorage.getItem('_fleetpro_session');
            if (sessionStr) {
                try {
                    const session = JSON.parse(sessionStr);

                    // SESSION TTL CHECK: 8 hours limit
                    const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
                    const loginAt = session.loginAt || 0;
                    if (Date.now() - loginAt > SESSION_MAX_AGE_MS) {
                        console.log('[Auth] Online session expired.');
                        localStorage.removeItem('_fleetpro_session');
                        setUser(null);
                        setUserId(null);
                        setTenantId(null);
                        setRole('viewer');
                        setLoading(false);
                        return;
                    }

                    setUserId(session.userId);
                    const normalizedRole = normalizeUserRole(session.role);
                    setRole(normalizedRole);
                    setTenantId(session.tenantId || null);
                    
                    // Note: We don't fetch full user details from GAS here to keep boot fast.
                    // The _fleetpro_session has what we need to route.
                    setUser({
                        id: session.userId,
                        email: session.email || session.userId,
                        password_hash: '',
                        full_name: session.full_name || session.userId,
                        role: normalizedRole,
                        status: 'active',
                        created_at: new Date(loginAt).toISOString(),
                        updated_at: new Date(loginAt).toISOString(),
                    });
                } catch (error) {
                    console.error('[Auth] Failed to restore online session:', error);
                }
            } else {
                setUser(null);
                setUserId(null);
                setTenantId(null);
                setRole('viewer');
            }
        } catch (error) {
            console.error('[Auth] Error initializing auth:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        initAuth();
    }, [initAuth]);

    const signOut = () => {
        localStorage.removeItem('_fleetpro_session');
        setUser(null);
        setUserId(null);
        setTenantId(null);
        setRole('viewer');
    };

    const value: AuthContextType = {
        user,
        userId,
        role,
        tenantId,
        signOut,
        refreshAuth: initAuth,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
