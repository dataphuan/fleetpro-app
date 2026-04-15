import React from 'react';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useVehicles } from '@/hooks/useVehicles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, Lock, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const PaywallGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    console.log("[FleetPro-Audit] PaywallGuard v1.2-bypass-active");
    const { data: settings, isLoading } = useCompanySettings();
    const { data: vehicles = [] } = useVehicles();
    const { role } = useAuth();

    // Filter active (not deleted) vehicles
    const activeVehicles = (vehicles || []).filter((v: any) => !v.is_deleted);

    if (isLoading) {
        return <>{children}</>;
    }

    const sub = settings?.subscription;

    // By default, if no subscription field exists yet, grant grace period
    if (!sub) {
        return <>{children}</>;
    }

    // Vehicle quota limits per plan — must match PLAN_LIMITS in constants.ts
    const quotaLimits: Record<string, number> = {
        trial: 5,             // Match PLAN_LIMITS.trial.vehicles
        pro: 50,              // Legacy Pro mapping
        professional: 50,     // Standard Pro Plan
        business: Infinity,   // Business Plan
        enterprise: Infinity, // Enterprise Plan
    };

    const planName = (sub.plan || 'trial').toLowerCase();
    let maxVehicles = quotaLimits[planName] || quotaLimits['professional'] || 100;
    const currentVehicles = activeVehicles.length;
    
    // Business rule: Phú An (paying customer) and Enterprise/Business plans bypass vehicle limits
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isMasterDemoId = settings?.tenant_id === 'internal-tenant-1' || 
                           settings?.tenant_id === 'internal-tenant-phuan' ||
                           (settings?.tenant_id || '').includes('phuan');

    const isPhuan = isMasterDemoId ||
                    settings?.company_name?.toLowerCase().includes('phú an') || 
                    settings?.company_name?.toLowerCase().includes('phu an') || 
                    hostname.includes('phuan');
                    
    const isHighTier = planName.includes('enterprise') || planName.includes('business');
    
    // Safety fallback: if it's high tier or Phuan, force maxVehicles to Infinity to prevent display bugs
    if (isHighTier || isPhuan) {
        maxVehicles = Infinity;
    }
    
    const isQuotaExceeded = !isPhuan && !isHighTier && planName !== 'trial' && currentVehicles > maxVehicles;

    let isExpired = false;
    let daysLeft = 0;
    const now = Date.now();

    if (sub.plan === 'trial') {
        const trialEnd = new Date(sub.trial_ends_at).getTime();
        isExpired = now > trialEnd;
        daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    } else {
        // basic or pro
        if (sub.status === 'expired') {
            isExpired = true;
        } else if (sub.next_billing_date) {
            const billDay = new Date(sub.next_billing_date).getTime();
            isExpired = now > billDay;
            daysLeft = Math.max(0, Math.ceil((billDay - now) / (1000 * 60 * 60 * 24)));
        }
    }

    if (isExpired) {
        return (
            <div className="relative w-full h-full min-h-screen overflow-hidden">
                {/* Blurred Background of actual children */}
                <div className="absolute inset-0 pointer-events-none blur-md opacity-30 select-none">
                    {children}
                </div>
                
                {/* Paywall Overlay */}
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-500">
                    <Card className="w-full max-w-lg shadow-2xl border-red-500/20 shadow-red-500/10">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                                <Lock className="w-8 h-8 text-red-600" />
                            </div>
                            <CardTitle className="text-2xl text-red-600 font-bold">Tài khoản đã hết hạn</CardTitle>
                            <CardDescription className="text-base mt-2">
                                {sub.plan === 'trial' 
                                    ? "Thời gian dùng thử 5 ngày của bạn đã kết thúc. Vui lòng nâng cấp gói cước để tiếp tục sử dụng hệ thống."
                                    : "Gói cước của bạn đã quá hạn thanh toán. Hệ thống đã tạm khóa để bảo vệ dữ liệu."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm text-amber-800 flex gap-3">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <p>Toàn bộ <strong>dữ liệu của bạn vẫn được lưu trữ an toàn</strong>. Chỉ cần thanh toán gia hạn, hệ thống sẽ mở khóa ngay lập tức.</p>
                            </div>
                            
                            {role === 'admin' ? (
                                <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700" asChild>
                                    <Link to="/pricing">
                                        <CreditCard className="w-5 h-5 mr-2" />
                                        Xem bảng giá & Nâng cấp
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="secondary" className="w-full" disabled>
                                    Vui lòng liên hệ Admin/Giám đốc để gia hạn
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Quotas exceeded warning (only for non-trial plans)
    if (isQuotaExceeded && sub.plan !== 'trial') {
        return (
            <div className="relative w-full h-full min-h-screen overflow-hidden">
                <div className="absolute inset-0 pointer-events-none blur-md opacity-30 select-none">
                    {children}
                </div>
                
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-500">
                    <Card className="w-full max-w-lg shadow-2xl border-orange-500/20 shadow-orange-500/10">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                                <Truck className="w-8 h-8 text-orange-600" />
                            </div>
                            <CardTitle className="text-2xl text-orange-600 font-bold">Vượt giới hạn Xe</CardTitle>
                            <CardDescription className="text-base mt-2">
                                Gói <strong>{planName.toUpperCase()}</strong> của bạn cho phép tối đa <strong>{maxVehicles}</strong> xe, nhưng hiện tại có <strong>{currentVehicles}</strong> xe.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg text-sm text-orange-800 flex gap-3">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <p>Vui lòng <strong>xóa hoặc vô hiệu hóa xe</strong> để giảm xuống giới hạn, hoặc <strong>nâng cấp gói cao hơn</strong>.</p>
                            </div>
                            
                            {role === 'admin' ? (
                                <>
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                                        <Link to="/pricing">
                                            <CreditCard className="w-5 h-5 mr-2" />
                                            Nâng Cấp Gói
                                        </Link>
                                    </Button>
                                    <Button variant="secondary" className="w-full" asChild>
                                        <Link to="/vehicles">
                                            <Truck className="w-5 h-5 mr-2" />
                                            Quản Lý Xe
                                        </Link>
                                    </Button>
                                </>
                            ) : (
                                <Button variant="secondary" className="w-full" disabled>
                                    Vui lòng liên hệ Admin để xử lý
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Floating Warning if expiring soon (<= 3 days)
    const showWarning = daysLeft > 0 && daysLeft <= 3;

    return (
        <div className="relative w-full h-full">
            {children}
            {showWarning && role === 'admin' && (
                <div className="fixed top-20 right-4 z-40 animate-bounce">
                    <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm cursor-pointer hover:bg-amber-200 transition-colors" onClick={() => window.location.hash = '#/pricing'}>
                        <AlertTriangle className="w-4 h-4" />
                        Gói cước sẽ hết hạn sau {daysLeft} ngày. Bấm để gia hạn.
                    </div>
                </div>
            )}
            {isQuotaExceeded && sub.plan !== 'trial' && role === 'admin' && (
                <div className="fixed bottom-20 right-4 z-40 animate-pulse">
                    <div className="bg-orange-100 border border-orange-300 text-orange-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm cursor-pointer hover:bg-orange-200 transition-colors" onClick={() => window.location.hash = '#/pricing'}>
                        <Truck className="w-4 h-4" />
                        Vượt giới hạn xe ({currentVehicles}/{maxVehicles}). Bấm để nâng cấp.
                    </div>
                </div>
            )}
        </div>
    );
};
