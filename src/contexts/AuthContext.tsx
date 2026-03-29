import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User } from "@/shared/types/domain";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { setRuntimeTenantId } from "@/lib/data-adapter";

import { UserRole } from "@/shared/types/domain";
import { normalizeUserRole } from "@/lib/rbac";
export type { UserRole };

interface AuthContextType {
    user: User | null;
    role: UserRole;
    userId: string | null;
    tenantId: string | null;
    signOut: () => Promise<void>;
    refreshAuth: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: 'viewer',
    userId: null,
    tenantId: null,
    signOut: async () => { },
    refreshAuth: async () => { },
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [role, setRole] = useState<UserRole>('viewer'); // SECURE DEFAULT
    const [loading, setLoading] = useState(true);

    const fetchUserMetadata = useCallback(async (firebaseUser: any) => {
        if (!firebaseUser) {
            setUser(null);
            setUserId(null);
            setTenantId(null);
            setRole('viewer');
            return;
        }

        try {
            // Fetch user document from Firestore to get Tenant ID and Role
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            let currentTenantId = '';
            let currentRole: UserRole = 'viewer';
            let fullName = firebaseUser.displayName || firebaseUser.email || firebaseUser.uid;
            
            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                currentTenantId = data.tenant_id || '';
                currentRole = normalizeUserRole(data.role);
                fullName = data.full_name || fullName;
            }

            setUserId(firebaseUser.uid);
            setRole(currentRole);
            setTenantId(currentTenantId);
            setRuntimeTenantId(currentTenantId);
            
            setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                password_hash: '',
                full_name: fullName,
                role: currentRole,
                status: 'active',
                created_at: firebaseUser.metadata.creationTime || new Date().toISOString(),
                updated_at: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
                tenant_id: currentTenantId
            });
        } catch (error) {
            console.error('[Auth] Error fetching user metadata:', error);
            // Fallback for failed metadata fetch
            setUserId(firebaseUser.uid);
            setRole('viewer');
        }
    }, []);

    useEffect(() => {
        // Dev mode auto-login
        if (import.meta.env.MODE === 'development' && import.meta.env.VITE_DEV_AUTO_LOGIN === 'true') {
            const devTenant = 'dev-tenant';
            setUserId('dev-admin');
            setRole('admin');
            setTenantId(devTenant);
            setRuntimeTenantId(devTenant);
            setUser({
                id: 'dev-admin',
                email: 'admin@dev.local',
                password_hash: '',
                full_name: 'Quản trị viên phát triển',
                role: 'admin',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                tenant_id: devTenant
            });
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);
            if (firebaseUser) {
                await fetchUserMetadata(firebaseUser);
            } else {
                setUser(null);
                setUserId(null);
                setTenantId(null);
                setRole('viewer');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [fetchUserMetadata]);

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            localStorage.removeItem('_fleetpro_session'); // Clean up old sessions just in case
        } catch (error) {
            console.error('[Auth] Logout error:', error);
        }
    };

    const refreshAuth = async () => {
        if (auth.currentUser) {
            setLoading(true);
            await fetchUserMetadata(auth.currentUser);
            setLoading(false);
        }
    };

    const value: AuthContextType = {
        user,
        userId,
        role,
        tenantId,
        signOut,
        refreshAuth,
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

