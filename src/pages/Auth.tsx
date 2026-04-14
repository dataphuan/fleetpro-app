import { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Truck, Mail, Lock, Building, User, ChevronDown, ChevronUp, Key, Info, AlertCircle, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { dataAdapter } from "@/lib/data-adapter";

const getDemoAccounts = () => {
    const isPhuAn = typeof window !== 'undefined' && window.location.hostname.includes('phuan.tnc.io.vn');
    
    if (isPhuAn) {
        return [
            { 
                role: "👑 Admin Phú An", 
                email: "admin@phuancr.com", 
                password: "Demo@1234", 
                color: "text-red-500",
                description: "Quản lý toàn bộ hệ thống Phú An",
                badge: "Full Access"
            },
            { 
                role: "👔 Quản lý Phú An", 
                email: "quanly@phuancr.com", 
                password: "Demo@1234", 
                color: "text-orange-500",
                description: "Điều phối xe & chuyến đi Phú An",
                badge: "Dispatch"
            },
            { 
                role: "🧾 Kế toán Phú An", 
                email: "ketoan@phuancr.com", 
                password: "Demo@1234", 
                color: "text-emerald-500",
                description: "Chi phí & báo cáo tài chính Phú An",
                badge: "Finance"
            },
            { 
                role: "🚚 Tài xế P.A", 
                email: "taixe1@phuancr.com", 
                password: "Demo@1234", 
                color: "text-blue-500",
                description: "Giao diện di động (PWA)",
                badge: "Mobile"
            },
        ];
    }
    
    return [
        { 
            role: "👑 Admin", 
            email: "admindemo@tnc.io.vn", 
            password: "Demo@1234", 
            color: "text-red-500",
            description: "Quản lý toàn bộ hệ thống",
            badge: "Full Access"
        },
        { 
            role: "👔 Quản lý", 
            email: "quanlydemo@tnc.io.vn", 
            password: "Demo@1234", 
            color: "text-orange-500",
            description: "Điều phối xe & chuyến đi",
            badge: "Dispatch"
        },
        { 
            role: "🧾 Kế toán", 
            email: "ketoandemo@tnc.io.vn", 
            password: "Demo@1234", 
            color: "text-emerald-500",
            description: "Chi phí & báo cáo tài chính",
            badge: "Finance"
        },
        { 
            role: "🚚 Tài xế", 
            email: "taixedemo@tnc.io.vn", 
            password: "Demo@1234", 
            color: "text-blue-500",
            description: "Giao diện di động (PWA)",
            badge: "Mobile"
        },
    ];
};

// 🟡 Vietnamese Validation Schema
const VALIDATION_MESSAGES = {
    email: {
        required: "Vui lòng nhập email hệ thống",
        invalid: "Định dạng email không hợp lệ (vd: user@example.com)"
    },
    password: {
        required: "Vui lòng nhập mật khẩu",
        tooshort: "Mật khẩu phải có ít nhất 8 ký tự"
    },
    fullName: {
        required: "Vui lòng nhập họ và tên"
    },
    company: {
        required: "Vui lòng nhập tên doanh nghiệp"
    }
};

export default function Auth() {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const { refreshAuth } = useAuth();

    const getPostLoginPath = (role?: string) => {
        const fromPath = (location.state as any)?.from?.pathname as string | undefined;

        if (role === 'driver') {
            return '/driver';
        }

        if (fromPath && fromPath !== '/auth') {
            return fromPath;
        }

        return '/';
    };
    
    // 📋 State
    const [loading, setLoading] = useState(false);
    const [showDemo, setShowDemo] = useState(true);
    const [tabValue, setTabValue] = useState("login");
    
    // 🔑 Login States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
    
    // 📝 Register States
    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regCompany, setRegCompany] = useState("");
    const [regErrors, setRegErrors] = useState<Record<string, string>>({});

    // 🔐 Forgot Password States
    const [resetEmail, setResetEmail] = useState("");
    const [resetLoading, setResetLoading] = useState(false);
    const emailInputRef = useRef<HTMLInputElement>(null);

    // 🛡️ Validation Functions with Vietnamese messages
    const validateEmail = (value: string): string | null => {
        if (!value.trim()) return VALIDATION_MESSAGES.email.required;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return VALIDATION_MESSAGES.email.invalid;
        return null;
    };

    const validatePassword = (value: string): string | null => {
        if (!value) return VALIDATION_MESSAGES.password.required;
        if (value.length < 8) return VALIDATION_MESSAGES.password.tooshort;
        return null;
    };

    const validateFullName = (value: string): string | null => {
        if (!value.trim()) return VALIDATION_MESSAGES.fullName.required;
        return null;
    };

    const validateCompany = (value: string): string | null => {
        if (!value.trim()) return VALIDATION_MESSAGES.company.required;
        return null;
    };

    // 🟢 Demo Account Auto-Fill Handler with Instant Login
    const handleDemoAccountClick = async (demoAccount: any) => {
        setEmail(demoAccount.email);
        setPassword(demoAccount.password);
        setLoginErrors({}); // Clear errors
        setLoading(true);

        try {
            // Auto-login with demo credentials
            let activeLoginResult = await dataAdapter.auth.login({
                email: demoAccount.email,
                password: demoAccount.password
            });
            
            if (!activeLoginResult || !activeLoginResult.success) {
                throw new Error(activeLoginResult?.error || 'Demo account đăng nhập không thành công');
            }

            await refreshAuth();

            const ensureResult = await dataAdapter.auth.ensureTenantDemoReadiness?.({
                tenantId: activeLoginResult?.data?.user?.tenantId,
                role: activeLoginResult?.data?.user?.role,
                email: activeLoginResult?.data?.user?.email,
                full_name: activeLoginResult?.data?.user?.full_name,
            });

            const DEMO_ACCOUNTS = getDemoAccounts();
            const adminDemoAccount = DEMO_ACCOUNTS[0];
            const isNotAdminDemo = demoAccount.email !== adminDemoAccount.email;

            if (ensureResult?.reason === 'requires_admin' && isNotAdminDemo) {
                const adminLogin = await dataAdapter.auth.login({
                    email: adminDemoAccount.email,
                    password: adminDemoAccount.password,
                });

                if (adminLogin?.success) {
                    await refreshAuth();
                    const adminEnsureResult = await dataAdapter.auth.ensureTenantDemoReadiness?.({
                        tenantId: adminLogin?.data?.user?.tenantId,
                        role: adminLogin?.data?.user?.role,
                        email: adminLogin?.data?.user?.email,
                        full_name: adminLogin?.data?.user?.full_name,
                    });

                    if (adminEnsureResult?.seeded) {
                        toast({
                            title: '✅ Đã sửa dữ liệu demo tự động',
                            description: 'Hệ thống dùng Admin Demo để nạp đủ dữ liệu, đang quay lại tài khoản bạn chọn.',
                        });
                    }

                    // Login back to the originally selected demo account
                    activeLoginResult = await dataAdapter.auth.login({
                        email: demoAccount.email,
                        password: demoAccount.password,
                    });

                    if (!activeLoginResult?.success) {
                        throw new Error(activeLoginResult?.error || 'Không thể đăng nhập lại tài khoản demo sau khi nạp dữ liệu.');
                    }
                    await refreshAuth();
                }
            }

            if (ensureResult?.seeded) {
                toast({
                    title: '✅ Đã nạp dữ liệu demo tự động',
                    description: 'Tenant thiếu dữ liệu đã được bổ sung để trải nghiệm full tính năng.',
                });
            } else if (ensureResult?.reason === 'requires_admin') {
                toast({
                    title: '⚠️ Cần tài khoản Admin Demo',
                    description: 'Tenant này thiếu dữ liệu. Hãy đăng nhập Admin để hệ thống tự nạp dữ liệu đầy đủ.',
                    variant: 'destructive',
                });
            }

            toast({
                title: `Chào mừng ${demoAccount.role}!`,
                description: "Đã đăng nhập với tài khoản demo thành công."
            });
            const userRole = activeLoginResult?.data?.user?.role;
            navigate(getPostLoginPath(userRole));
        } catch (error: any) {
            toast({
                title: "Lỗi đăng nhập Demo",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // 🔐 Login Handler with Validation
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};

        // Validate both fields
        const emailErr = validateEmail(email);
        const passwordErr = validatePassword(password);

        if (emailErr) errors.email = emailErr;
        if (passwordErr) errors.password = passwordErr;

        setLoginErrors(errors);

        // Stop if there are validation errors
        if (Object.keys(errors).length > 0) {
            toast({
                title: "Kiểm tra lại thông tin",
                description: "Vui lòng sửa các lỗi được đánh dấu bên dưới",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            const result = await dataAdapter.auth.login({ email, password });
            if (!result || !result.success) throw new Error(result?.error || 'Sai email hoặc mật khẩu');

            await refreshAuth();

            // Removed automatic demo seeding for professional "Real Data" accounts

            toast({ title: "Đăng nhập thành công", description: `Chào mừng trở lại!` });
            const userRole = result?.data?.user?.role;
            navigate(getPostLoginPath(userRole));
        } catch (error: any) {
            // 🔴 Check for Firebase API key issues
            if (error.message.includes("auth/api-key-not-valid")) {
                toast({
                    title: "❌ Lỗi Firebase API Key",
                    description: "API Key không hợp lệ. Vui lòng liên hệ quản trị viên.",
                    variant: "destructive"
                });
            } else if (error.message.includes("auth/user-not-found")) {
                // SUPER ADMIN AUTO-SEED: If this is the coach's email, auto-register
                if (email.toLowerCase() === 'coach.chuyen@gmail.com') {
                    toast({ title: "🔨 Khởi tạo Super Admin...", description: "Hệ thống đang tự động đăng ký tài khoản quản trị cho bạn." });
                    try {
                        const regResult = await dataAdapter.auth.register({
                            email: email.toLowerCase(),
                            password: password,
                            full_name: "Super Admin Coach",
                            company_name: "FleetPro Systems"
                        });
                        
                        if (regResult.success) {
                            // Retry login automatically
                            const loginResult = await dataAdapter.auth.login({ email, password });
                            if (loginResult.success) {
                                await refreshAuth();
                                toast({ title: "✅ Kích hoạt thành công", description: "Chào mừng Super Admin trở lại hệ thống!" });
                                navigate(getPostLoginPath(loginResult?.data?.user?.role));
                                return;
                            }
                        }
                    } catch (regError: any) {
                        console.error('Auto-seed failed:', regError);
                    }
                }
                setLoginErrors({ email: "Email này chưa được đăng ký" });
            } else if (error.message.includes("auth/wrong-password")) {
                setLoginErrors({ password: "Mật khẩu không chính xác" });
            } else {
                toast({
                    title: "Lỗi đăng nhập",
                    description: error.message,
                    variant: "destructive"
                });
            }
        } finally {
            setLoading(false);
        }
    };

    // 📝 Register Handler with Validation
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};

        // Validate all fields
        const nameErr = validateFullName(regName);
        const companyErr = validateCompany(regCompany);
        const emailErr = validateEmail(regEmail);
        const passwordErr = validatePassword(regPassword);

        if (nameErr) errors.fullName = nameErr;
        if (companyErr) errors.company = companyErr;
        if (emailErr) errors.email = emailErr;
        if (passwordErr) errors.password = passwordErr;

        setRegErrors(errors);

        // Stop if there are validation errors
        if (Object.keys(errors).length > 0) {
            toast({
                title: "Kiểm tra lại thông tin",
                description: "Vui lòng sửa các lỗi được đánh dấu bên dưới",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            const result = await dataAdapter.auth.register({
                email: regEmail,
                password: regPassword,
                full_name: regName,
                company_name: regCompany
            });

            if (!result || !result.success) throw new Error(result?.error || 'Đăng ký thất bại');

            toast({
                title: "🎉 Đăng ký thành công!",
                description: "Không gian làm việc của bạn đã sẵn sàng. Vui lòng đăng nhập với Dữ liệu thật.",
            });
            
            // Auto-fill login email and switch to login tab
            setEmail(regEmail);
            setPassword("");
            setTabValue("login");
            setRegName("");
            setRegEmail("");
            setRegPassword("");
            setRegCompany("");
            setRegErrors({});
        } catch (error: any) {
            if (error.message.includes("auth/email-already-in-use")) {
                setRegErrors({ email: "Email này đã được đăng ký" });
            } else if (error.message.includes("auth/weak-password")) {
                setRegErrors({ password: "Mật khẩu quá yếu. Sử dụng ít nhất 8 ký tự với chữ hoa và số" });
            } else {
                toast({
                    title: "Lỗi đăng ký",
                    description: error.message,
                    variant: "destructive"
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetEmail) {
            toast({
                title: "Thông báo",
                description: "Vui lòng nhập địa chỉ email",
                variant: "destructive"
            });
            return;
        }
        setResetLoading(true);
        try {
            const result = await dataAdapter.auth.resetPassword(resetEmail);
            if (!result.success) throw new Error(result.error);
            toast({
                title: "✉️ Yêu cầu đã gửi",
                description: "Vui lòng kiểm tra email để đặt lại mật khẩu. (Kiểm tra cả thư rác)"
            });
            setResetEmail("");
        } catch (error: any) {
            toast({
                title: "Lỗi",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setResetLoading(false);
        }
    };

    const handleCopyDemoEmail = async (emailToCopy: string) => {
        try {
            await navigator.clipboard.writeText(emailToCopy);
            toast({
                title: "Da copy email demo",
                description: emailToCopy,
            });
        } catch {
            toast({
                title: "Khong the copy",
                description: "Trinh duyet khong ho tro copy tu dong. Vui long copy thu cong.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
            <div className="w-full max-w-lg space-y-4">
                <Card className="shadow-2xl border-primary/10 overflow-hidden">
                    <CardHeader className="text-center pb-2 bg-white">
                        <div className="flex justify-center mb-4">
                            <div className="bg-primary/10 p-4 rounded-2xl shadow-inner">
                                <Truck className="w-12 h-12 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">FleetPro Online</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">
                            Quản lý vận tải thông minh - Tiêu chuẩn Enterprise SaaS
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-6">
                        <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1 rounded-xl">
                                <TabsTrigger value="login" className="rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Đăng nhập</TabsTrigger>
                                <TabsTrigger value="register" className="rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Tạo tài khoản mới</TabsTrigger>
                            </TabsList>

                            {/* LOGIN TAB */}
                            <TabsContent value="login">
                                <div className="mb-4 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-blue-50 p-3">
                                    <div className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <Key className="w-3 h-3 text-primary" />
                                        ⚡ Trải nghiệm nhanh (1 chạm) - {typeof window !== 'undefined' && window.location.hostname.includes('phuan') ? `Dữ liệu thật Phú An` : `Gói PRO cao cấp`}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {getDemoAccounts().map((acc, idx) => (
                                            <Button
                                                key={idx}
                                                type="button"
                                                variant="outline"
                                                className="h-12 flex flex-col items-start p-2 border-slate-200 bg-white hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                                                onClick={() => handleDemoAccountClick(acc)}
                                                disabled={loading}
                                            >
                                                <div className="text-[10px] font-bold text-slate-900 leading-tight">{acc.role}</div>
                                                <div className="text-[8px] text-slate-500 font-medium">{acc.badge}</div>
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-5">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-slate-700 font-semibold">📧 Email hệ thống</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                                <Input
                                                    ref={emailInputRef}
                                                    id="email"
                                                    type="email"
                                                    placeholder="email@congty.com"
                                                    className={`pl-10 h-11 border-slate-200 focus:ring-primary/20 ${loginErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                                                    value={email}
                                                    onChange={(e) => {
                                                        setEmail(e.target.value);
                                                        if (loginErrors.email) setLoginErrors({ ...loginErrors, email: '' });
                                                    }}
                                                    disabled={loading}
                                                />
                                            </div>
                                            {loginErrors.email && (
                                                <div className="flex items-center gap-2 text-red-500 text-xs font-medium">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {loginErrors.email}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="password" className="text-slate-700 font-semibold">🔐 Mật khẩu</Label>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="link" className="px-0 h-auto text-xs font-semibold text-primary/80 hover:text-primary">Quên mật khẩu?</Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Khôi phục mật khẩu</DialogTitle>
                                                            <DialogDescription>Nhập email tài khoản của bạn để nhận liên kết đặt lại mật khẩu.</DialogDescription>
                                                        </DialogHeader>
                                                        <div className="py-4">
                                                            <Input 
                                                                placeholder="your@email.com" 
                                                                value={resetEmail} 
                                                                onChange={(e) => setResetEmail(e.target.value)}
                                                            />
                                                        </div>
                                                        <DialogFooter>
                                                            <Button onClick={handleResetPassword} disabled={resetLoading}>
                                                                {resetLoading ? "Đang gửi..." : "Gửi liên kết"}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    placeholder="••••••••"
                                                    className={`pl-10 h-11 border-slate-200 focus:ring-primary/20 ${loginErrors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                                                    value={password}
                                                    onChange={(e) => {
                                                        setPassword(e.target.value);
                                                        if (loginErrors.password) setLoginErrors({ ...loginErrors, password: '' });
                                                    }}
                                                    disabled={loading}
                                                />
                                            </div>
                                            {loginErrors.password && (
                                                <div className="flex items-center gap-2 text-red-500 text-xs font-medium">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {loginErrors.password}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20" disabled={loading}>
                                        {loading ? "⏳ Đang xác thực..." : "🚀 Vào hệ thống ngay"}
                                    </Button>
                                </form>
                            </TabsContent>

                            {/* REGISTER TAB */}
                            <TabsContent value="register">
                                <form onSubmit={handleRegister} className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="regName" className="text-slate-700">Họ và tên *</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                                <Input
                                                    id="regName"
                                                    placeholder="Nguyễn Văn A"
                                                    className={`pl-10 h-11 ${regErrors.fullName ? 'border-red-500' : ''}`}
                                                    value={regName}
                                                    onChange={(e) => {
                                                        setRegName(e.target.value);
                                                        if (regErrors.fullName) setRegErrors({ ...regErrors, fullName: '' });
                                                    }}
                                                    disabled={loading}
                                                />
                                            </div>
                                            {regErrors.fullName && (
                                                <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {regErrors.fullName}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="regCompany" className="text-slate-700">Doanh nghiệp *</Label>
                                            <div className="relative">
                                                <Building className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                                <Input
                                                    id="regCompany"
                                                    placeholder="Công ty X"
                                                    className={`pl-10 h-11 ${regErrors.company ? 'border-red-500' : ''}`}
                                                    value={regCompany}
                                                    onChange={(e) => {
                                                        setRegCompany(e.target.value);
                                                        if (regErrors.company) setRegErrors({ ...regErrors, company: '' });
                                                    }}
                                                    disabled={loading}
                                                />
                                            </div>
                                            {regErrors.company && (
                                                <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {regErrors.company}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="regEmail" className="text-slate-700">Email doanh nghiệp *</Label>
                                        <Input
                                            id="regEmail"
                                            type="email"
                                            placeholder="admin@congty.com"
                                            className={`h-11 ${regErrors.email ? 'border-red-500' : ''}`}
                                            value={regEmail}
                                            onChange={(e) => {
                                                setRegEmail(e.target.value);
                                                if (regErrors.email) setRegErrors({ ...regErrors, email: '' });
                                            }}
                                            disabled={loading}
                                        />
                                        {regErrors.email && (
                                            <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
                                                <AlertCircle className="w-3 h-3" />
                                                {regErrors.email}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="regPassword" className="text-slate-700">Mật khẩu tối thiểu 8 ký tự *</Label>
                                        <Input
                                            id="regPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            className={`h-11 ${regErrors.password ? 'border-red-500' : ''}`}
                                            value={regPassword}
                                            onChange={(e) => {
                                                setRegPassword(e.target.value);
                                                if (regErrors.password) setRegErrors({ ...regErrors, password: '' });
                                            }}
                                            disabled={loading}
                                        />
                                        {regErrors.password && (
                                            <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
                                                <AlertCircle className="w-3 h-3" />
                                                {regErrors.password}
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full h-11 text-base font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200"
                                        disabled={loading}>
                                        {loading ? "⏳ Đang khởi tạo..." : "🎁 Bắt đầu dùng thử miễn phí"}
                                    </Button>
                                    <p className="text-[10px] text-center text-slate-400 italic">
                                        Bằng cách đăng ký, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
                                    </p>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>

                    <CardFooter className="flex flex-col border-t bg-slate-50/50 pt-4 px-6 pb-6 space-y-3">
                        <button 
                            type="button"
                            onClick={() => setShowDemo(!showDemo)}
                            className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors w-full justify-center"
                        >
                            {showDemo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            🎁 TÀI KHOẢN DÙNG THỬ (1,300+ BẢN GHI DEMO) - CLICK ĐỂ TRẢI NGHIỆM
                        </button>
                        
                        {showDemo && (
                            <div className="bg-gradient-to-br from-blue-50 to-primary/5 border-2 border-primary/30 rounded-lg p-4 animate-in fade-in slide-in-from-top-1 duration-300 space-y-3">
                                {/* Demo Data Summary */}
                                <div className="bg-white rounded-lg p-3 border border-primary/20">
                                    <div className="flex items-start gap-3">
                                        <div className="text-xl">✨</div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-slate-900 mb-2">
                                                DEMO DATA READY - TOÀN BỘ TÍNH NĂNG ĐƯỢC MỞ KHÓA
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                                                <div>✅ 20 xe + 25 tài xế</div>
                                                <div>✅ 50 chuyến + 15 tuyến</div>
                                                <div>✅ 967 chi phí</div>
                                                <div>✅ 10 khách hàng</div>
                                                <div>✅ Bảo trì & lốp xe</div>
                                                <div>✅ Kế toán & báo cáo</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Information */}
                                <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                                    <p className="text-[10px] text-primary font-medium leading-relaxed">
                                        💡 <b>Lưu ý:</b> Các tài khoản trên dùng chung dữ liệu mẫu. Để sử dụng <b>Dữ liệu thật</b> riêng biệt cho doanh nghiệp (FREE Pro Plan), vui lòng chọn tab <b>"Tạo tài khoản mới"</b>.
                                    </p>
                                </div>

                                {/* Password Info */}
                                <div className="flex items-center justify-between bg-white rounded border border-slate-100 p-2.5">
                                    <div className="text-[9px] text-slate-600">
                                        🔐 Mật khẩu: <span className="font-mono font-bold text-slate-900">Demo@1234</span>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            navigator.clipboard.writeText("Demo@1234");
                                            toast({ title: "Đã copy mật khẩu", description: "Demo@1234" });
                                        }}
                                        className="h-6 px-2 text-[10px]"
                                    >
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>

                                {/* Tips */}
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[9px] text-amber-900">
                                    <div className="font-bold mb-1">💡 Bắt đầu từ đây:</div>
                                    <ul className="space-y-1 ml-4 list-disc">
                                        <li>Login với Admin để xem toàn bộ hệ thống</li>
                                        <li>Kéo xuống "Xe" để thấy 20 chiếc xe ví dụ</li>
                                        <li>Thu thập dữ liệu (20 xe, 25 tài xế, 50 chuyến...)</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                        
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                <a
                                    href="https://zalo.me/0989890022"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-primary/30 bg-primary/5 text-[11px] uppercase tracking-widest font-black text-primary hover:bg-primary/10 transition-colors"
                                >
                                    <Info className="w-3 h-3" />
                                    Support Zalo
                                </a>
                                <a
                                    href="https://tnc.io.vn/contact"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-slate-300 bg-white text-[11px] uppercase tracking-widest font-black text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <Info className="w-3 h-3" />
                                    Contact
                                </a>
                            </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
