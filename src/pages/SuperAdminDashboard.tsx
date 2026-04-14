import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { companySettingsAdapter } from '@/lib/data-adapter';
import { ShieldCheck, Search, Zap, ExternalLink, ArrowRight, Save } from 'lucide-react';

const PLAN_OPTIONS = [
    { value: 'trial', label: 'Dùng thử (Trial)', color: 'bg-slate-100 text-slate-800' },
    { value: 'professional', label: 'Chuyên nghiệp (Professional)', color: 'bg-blue-100 text-blue-800 font-bold' },
    { value: 'business', label: 'Doanh nghiệp (Business)', color: 'bg-amber-100 text-amber-800 font-bold' },
    { value: 'enterprise', label: 'Cao cấp (Enterprise)', color: 'bg-indigo-100 text-indigo-800 font-black tracking-tighter' },
];

export default function SuperAdminDashboard() {
    const [targetTenantId, setTargetTenantId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentSettings, setCurrentSettings] = useState<any>(null);
    const [selectedPlan, setSelectedPlan] = useState<string>('professional');
    const { toast } = useToast();

    const handleSearch = async () => {
        if (!targetTenantId.trim()) return;
        setIsLoading(true);
        setCurrentSettings(null);
        try {
            // In our system, the doc ID is usually the tenantId
            const settings = await companySettingsAdapter.get(targetTenantId.trim());
            if (settings) {
                setCurrentSettings(settings);
                setSelectedPlan(settings.subscription?.plan || 'trial');
                toast({ title: 'Tìm thấy dữ liệu', description: `Công ty: ${settings.company_name || 'N/A'}` });
            } else {
                toast({ title: 'Không tìm thấy', description: 'Tenant ID này chưa có cấu hình company_settings.', variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Lỗi truy vấn', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpgrade = async () => {
        if (!targetTenantId.trim()) return;
        setIsLoading(true);
        try {
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);

            await companySettingsAdapter.upsert({
                id: targetTenantId.trim(),
                subscription: {
                    plan: selectedPlan,
                    status: 'active',
                    trial_ends_at: new Date().toISOString(), // Reset trial
                    next_billing_date: nextYear.toISOString()
                },
                updated_at: new Date().toISOString()
            });

            toast({ 
                title: 'Nâng cấp thành công!', 
                description: `Tenant ${targetTenantId} đã được chuyển sang gói ${selectedPlan.toUpperCase()}.`,
                variant: 'default'
            });
            
            // Refresh local state
            handleSearch();
        } catch (error: any) {
            toast({ title: 'Lỗi nâng cấp', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container py-10 max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="bg-red-600 p-2 rounded-lg shadow-lg shadow-red-200">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Hệ Thống Quản Trị Trung Tâm</h1>
                        <p className="text-slate-500">Dành riêng cho Super Admin — Quản lý gói cước & Quyền hạn FleetPro.</p>
                    </div>
                </div>
            </header>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Search Card */}
                <Card className="shadow-xl border-slate-200 overflow-hidden">
                    <CardHeader className="bg-slate-50/50">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Search className="w-5 h-5 text-blue-600" /> Tìm kiếm Tenant
                        </CardTitle>
                        <CardDescription>Nhập Tenant ID (ví dụ: internal-tenant-phuan) để kiểm tra cấu hình.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Nhập ID khách hàng..." 
                                value={targetTenantId}
                                onChange={(e) => setTargetTenantId(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="h-12 text-lg font-mono font-medium"
                            />
                            <Button size="icon" className="h-12 w-12 shrink-0" onClick={handleSearch} disabled={isLoading}>
                                <Search className="w-5 h-5" />
                            </Button>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50/30 flex-col items-start gap-3">
                         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">TENANT GẦN ĐÂY</div>
                         <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="cursor-pointer hover:bg-white" onClick={() => setTargetTenantId('internal-tenant-phuan')}>Phú An</Badge>
                            <Badge variant="outline" className="cursor-pointer hover:bg-white" onClick={() => setTargetTenantId('internal-tenant-1')}>Master Demo</Badge>
                         </div>
                    </CardFooter>
                </Card>

                {/* Info Display Card */}
                <Card className="shadow-xl border-slate-200 transition-all duration-300">
                    <CardHeader>
                        <CardTitle className="text-lg">Trạng thái hiện tại</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {currentSettings ? (
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Công ty</div>
                                    <div className="text-xl font-bold text-slate-900">{currentSettings.company_name}</div>
                                    <div className="text-[10px] font-mono text-slate-400">{currentSettings.id}</div>
                                </div>
                                <div className="flex justify-between items-center border-t border-b py-4">
                                    <div>
                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 text-center">Hiện tại</div>
                                        <Badge className={`px-3 py-1 text-[10px] w-full justify-center ${PLAN_OPTIONS.find(p => p.value === (currentSettings.subscription?.plan || 'trial'))?.color}`}>
                                            {(currentSettings.subscription?.plan || 'trial').toUpperCase()}
                                        </Badge>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-slate-300" />
                                    <div className="text-right">
                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 text-center">Nâng cấp</div>
                                        <Badge variant="outline" className="px-3 py-1 text-[10px] border-blue-500 text-blue-600 w-full justify-center">
                                            {selectedPlan.toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1 border-t pt-4">
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Thông tin liên hệ</div>
                                    <div className="text-sm font-medium text-slate-700">{currentSettings.email || 'N/A'}</div>
                                    <div className="text-sm text-slate-600 line-clamp-1">{currentSettings.address || 'Chưa cập nhật địa chỉ'}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center text-slate-400 space-y-2 border-2 border-dashed rounded-xl">
                                <Zap className="w-8 h-8 opacity-20" />
                                <p className="text-sm">Vui lòng nhập ID để xem thông tin</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Action Card */}
            {currentSettings && (
                <Card className="shadow-2xl border-blue-100 bg-gradient-to-r from-white to-blue-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                             <ExternalLink className="w-5 h-5 text-blue-600" /> Kích hoạt Gói Cước
                        </CardTitle>
                        <CardDescription>Chọn gói cước bạn muốn áp dụng cho khách hàng này.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full space-y-2">
                            <label className="text-xs font-bold text-slate-500">DANH SÁCH GÓI CƯỚC</label>
                            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                                <SelectTrigger className="h-12 bg-white">
                                    <SelectValue placeholder="Chọn gói cước..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {PLAN_OPTIONS.map(plan => (
                                        <SelectItem key={plan.value} value={plan.value}>
                                            <div className="flex items-center gap-2">
                                                <Badge className={plan.color} variant="outline">{plan.label}</Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button 
                            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 gap-2 w-full md:w-auto"
                            onClick={handleUpgrade}
                            disabled={isLoading}
                        >
                            <Save className="w-5 h-5" /> Thực hiện Nâng cấp
                        </Button>
                    </CardContent>
                </Card>
            )}

            <footer className="pt-10 border-t flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-widest">
                <div>SYSTEM CONTROL PANEL V1.0</div>
                <div>AUTORIZED ACCESS ONLY</div>
            </footer>
        </div>
    );
}
