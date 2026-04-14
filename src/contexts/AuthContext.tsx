import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User } from "@/shared/types/domain";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
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

    const signOut = useCallback(async () => {
        try {
            await firebaseSignOut(auth);
            localStorage.removeItem('_fleetpro_session'); // Clean up old sessions just in case
        } catch (error) {
            console.error('[Auth] Logout error:', error);
        }
    }, []);

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
            let avatarUrl = firebaseUser.photoURL || '';
            
            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                currentTenantId = data.tenant_id || '';
                currentRole = normalizeUserRole(data.role);
                fullName = data.full_name || fullName;
                avatarUrl = data.avatar_url || avatarUrl;
            } else if (firebaseUser.email) {
                // Self-heal user mapping: resolve by email when uid document is missing.
                const byEmail = await getDocs(query(collection(db, 'users'), where('email', '==', firebaseUser.email)));
                if (!byEmail.empty) {
                    const data = byEmail.docs[0].data();
                    currentTenantId = data.tenant_id || '';
                    currentRole = normalizeUserRole(data.role);
                    fullName = data.full_name || fullName;
                    avatarUrl = data.avatar_url || avatarUrl;

                    await setDoc(doc(db, 'users', firebaseUser.uid), {
                        ...data,
                        email: firebaseUser.email,
                        updated_at: new Date().toISOString(),
                    }, { merge: true });
                } else {
                    // QA AUDIT FIX: Auto-create user document for first-time users on new tenant
                    // Generate a unique tenant ID based on email domain (or use user's email as tenant ID)
                    const emailParts = firebaseUser.email.split('@');
                    currentTenantId = `tenant-${emailParts[0]}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    currentRole = 'admin'; // First user on new tenant is admin
                    fullName = firebaseUser.displayName || firebaseUser.email;
                    avatarUrl = firebaseUser.photoURL || '';

                    // Create user document
                    await setDoc(doc(db, 'users', firebaseUser.uid), {
                        tenant_id: currentTenantId,
                        email: firebaseUser.email,
                        role: currentRole,
                        full_name: fullName,
                        avatar_url: avatarUrl,
                        status: 'active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }, { merge: true });

                    // Create default company_settings for new tenant (PRO PLAN by default for "WOW" experience)
                    await setDoc(doc(db, 'company_settings', currentTenantId), {
                        tenant_id: currentTenantId,
                        company_name: `${emailParts[0]}'s Company`,
                        email: firebaseUser.email,
                        subscription: { 
                            plan: 'trial', 
                            status: 'active',
                            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14-day trial
                        },
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }, { merge: true });

                    console.log(`[AUTH] Created new tenant ${currentTenantId} for user ${firebaseUser.email}`);
                }
            }

            // SUPER-ADMIN OVERRIDE: If user is Coach.chuyen@gmail.com, force superadmin role
            if (firebaseUser.email?.toLowerCase() === 'coach.chuyen@gmail.com') {
                currentRole = 'superadmin';
            }

            setUserId(firebaseUser.uid);
            setRole(currentRole);
            setTenantId(currentTenantId);
            setRuntimeTenantId(currentTenantId);
            
            setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                full_name: fullName,
                avatar_url: avatarUrl,
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
                full_name: 'Quản trị viên phát triển',
                avatar_url: '',
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

    // QA AUDIT FIX 4.3: Idle session timeout (30 minutes in production)
    useEffect(() => {
        if (import.meta.env.MODE === 'development') return;
        if (!userId) return;

        const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
        let idleTimer: ReturnType<typeof setTimeout>;

        const resetTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(async () => {
                console.warn('[Auth] Session expired due to inactivity');
                await signOut();
            }, IDLE_TIMEOUT_MS);
        };

        const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'visibilitychange'];
        events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
        resetTimer();

        return () => {
            clearTimeout(idleTimer);
            events.forEach(e => window.removeEventListener(e, resetTimer));
        };
    }, [userId, signOut]);

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

