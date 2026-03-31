import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Truck, Mail, Lock, Building, User, ChevronDown, ChevronUp, Key, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { dataAdapter } from "@/lib/data-adapter";

export default function Auth() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { refreshAuth } = useAuth();
    
    // State
    const [loading, setLoading] = useState(false);
    const [showDemo, setShowDemo] = useState(false);
    
    // Auth States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    
    // Register States
    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regCompany, setRegCompany] = useState("");

    // Forgot Password States
    const [resetEmail, setResetEmail] = useState("");
    const [resetLoading, setResetLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await dataAdapter.auth.login({ email, password });
            if (!result || !result.success) throw new Error(result?.error || 'Sai email hoặc mật khẩu');

            await refreshAuth();
            toast({ title: "Đăng nhập thành công", description: `Chào mừng trở lại!` });
            navigate("/");
        } catch (error: any) {
            toast({ title: "Lỗi đăng nhập", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
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
                title: "Đăng ký thành công!",
                description: "Không gian làm việc của bạn đã sẵn sàng. Vui lòng đăng nhập.",
            });
            
            // Auto-fill login email for convenience
            setEmail(regEmail);
            // Switch to login tab could be done via a state on Tabs
        } catch (error: any) {
            toast({ title: "Lỗi đăng ký", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetEmail) return;
        setResetLoading(true);
        try {
            const result = await dataAdapter.auth.resetPassword(resetEmail);
            if (!result.success) throw new Error(result.error);
            toast({ title: "Yêu cầu đã gửi", description: "Vui lòng kiểm tra email để đặt lại mật khẩu." });
        } catch (error: any) {
            toast({ title: "Lỗi", description: error.message, variant: "destructive" });
        } finally {
            setResetLoading(false);
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
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1 rounded-xl">
                                <TabsTrigger value="login" className="rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Đăng nhập</TabsTrigger>
                                <TabsTrigger value="register" className="rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Tạo tài khoản mới</TabsTrigger>
                            </TabsList>

                            {/* LOGIN TAB */}
                            <TabsContent value="login">
                                <form onSubmit={handleLogin} className="space-y-5">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-slate-700">Email hệ thống</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                                <Input
                                                    id="email" type="email" placeholder="email@congty.com"
                                                    className="pl-10 h-11 border-slate-200 focus:ring-primary/20"
                                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                                    required disabled={loading}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="password">Mật khẩu</Label>
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
                                                    id="password" type="password" placeholder="••••••••"
                                                    className="pl-10 h-11 border-slate-200 focus:ring-primary/20"
                                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                                    required disabled={loading}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20" disabled={loading}>
                                        {loading ? "Đang xác thực..." : "🚀 Vào hệ thống ngay"}
                                    </Button>
                                </form>
                            </TabsContent>

                            {/* REGISTER TAB */}
                            <TabsContent value="register">
                                <form onSubmit={handleRegister} className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="regName">Họ và tên</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                                <Input
                                                    id="regName" placeholder="Nguyễn Văn A" 
                                                    className="pl-10 h-11"
                                                    value={regName} onChange={(e) => setRegName(e.target.value)}
                                                    required disabled={loading}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="regCompany">Tên doanh nghiệp</Label>
                                            <div className="relative">
                                                <Building className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                                <Input
                                                    id="regCompany" placeholder="Công ty Vận tải X"
                                                    className="pl-10 h-11"
                                                    value={regCompany} onChange={(e) => setRegCompany(e.target.value)}
                                                    required disabled={loading}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="regEmail">Email doanh nghiệp</Label>
                                        <Input
                                            id="regEmail" type="email" placeholder="admin@congty.com"
                                            className="h-11"
                                            value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                                            required disabled={loading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="regPassword">Mật khẩu (Tối thiểu 8 ký tự)</Label>
                                        <Input
                                            id="regPassword" type="password" placeholder="••••••••"
                                            className="h-11"
                                            value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                                            required minLength={8} disabled={loading}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full h-11 text-base font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200" disabled={loading}>
                                        {loading ? "Đang khởi tạo không gian..." : "🎁 Bắt đầu dùng thử miễn phí"}
                                    </Button>
                                    <p className="text-[10px] text-center text-slate-400 italic">
                                        Bằng cách đăng ký, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
                                    </p>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>

                    <CardFooter className="flex flex-col border-t bg-slate-50/50 pt-4 px-6 pb-6">
                        <button 
                            type="button"
                            onClick={() => setShowDemo(!showDemo)}
                            className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors mb-2"
                        >
                            {showDemo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            TÀI KHOẢN DÙNG THỬ (DEMO MODE)
                        </button>
                        
                        {showDemo && (
                            <Alert className="bg-white/80 border-primary/20 animate-in fade-in slide-in-from-top-1 duration-300">
                                <Key className="h-4 w-4 text-primary" />
                                <AlertTitle className="text-xs font-bold text-primary">Danh sách tài khoản Demo (Enterprise Mode):</AlertTitle>
                                <AlertDescription className="grid grid-cols-2 gap-3 text-[10px] text-slate-600 mt-2">
                                    <div><span className="font-bold text-red-500">👨‍💼 CEO:</span> CEO@demo.tnc.io.vn / Demo@1234</div>
                                    <div><span className="font-bold text-orange-500">👔 MGR:</span> Manager@demo.tnc.io.vn / Demo@1234</div>
                                    <div><span className="font-bold text-blue-500">👨‍✈️ DRV:</span> Driver@demo.tnc.io.vn / Demo@1234</div>
                                    <div><span className="font-bold text-purple-500">👨‍💻 DEV:</span> Developer@demo.tnc.io.vn / Demo@1234</div>
                                    <div className="col-span-2 text-center text-[9px] text-slate-400 mt-2 p-1 bg-slate-100 rounded">
                                        ✨ <span className="italic">Mật khẩu chung:</span> <span className="font-mono font-bold text-slate-700">Demo@1234</span>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                        
                        <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-slate-400 uppercase tracking-widest font-black">
                             <Info className="w-3 h-3" />
                             Powered by Google Cloud & Firebase
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
