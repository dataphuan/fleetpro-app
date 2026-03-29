import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Truck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { dataAdapter } from "@/lib/data-adapter";

export default function Auth() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { refreshAuth } = useAuth();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Redirect if already logged in
    useEffect(() => {
        const session = localStorage.getItem('_fleetpro_session');
        if (session) {
            navigate("/");
        }
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Dev mode auto-login enabled
            if (import.meta.env.MODE === 'development' && import.meta.env.VITE_DEV_AUTO_LOGIN === 'true') {
                await refreshAuth();
                toast({
                    title: "Đăng nhập thành công (Dev Mode)",
                    description: "Chào mừng Quản trị viên phát triển!",
                });
                navigate("/");
                return;
            }

            // Online Firebase Authentication
            const result = await dataAdapter.auth.login({ email, password });

            if (!result || !result.success) {
                throw new Error(result?.error || 'Đăng nhập thất bại (sai email hoặc mật khẩu)');
            }

            // Save session to localStorage with TTL
            localStorage.setItem('_fleetpro_session', JSON.stringify({
                userId: result.data.user.id,
                email: result.data.user.email,
                full_name: result.data.user.full_name,
                role: result.data.user.role,
                tenantId: result.data.user.tenantId,
                loginAt: Date.now(),
            }));

            // Refresh AuthContext
            await refreshAuth();

            toast({
                title: "Đăng nhập thành công",
                description: `Chào mừng ${result.data.user.email}!`,
            });

            navigate("/");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi kết nối";
            toast({
                title: "Đăng nhập thất bại",
                description: message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Truck className="w-10 h-10 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-xl font-bold text-primary">Công ty cổ phần Sao Vàng</CardTitle>
                    <CardDescription>
                        Hệ thống quản lý đội xe chuyên nghiệp
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm text-slate-700 space-y-2">
                            <p className="font-semibold text-primary">🔑 Tài khoản hệ thống (Test Accounts):</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><b className="text-red-600">CEO (Admin):</b> <br/>gdkd.3t@gmail.com<br/>Tnc@1980</div>
                                <div><b className="text-orange-600">Kế Toán (Manager):</b> <br/>Coach.chuyen@gmail.com<br/>Tnc@1980</div>
                                <div><b className="text-blue-600">Tài xế (Driver):</b> <br/>Victorchuyen68@gmail.com<br/>Tnc@1980</div>
                                <div><b className="text-purple-600">Dev/IT:</b> <br/>dataphuan@gmail.com<br/>Phuancr@2026</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="text"
                                placeholder="gdkd.3t@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Mật khẩu</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Nhập Mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                        </Button>

                        <div className="text-xs text-slate-500 text-center mt-4">
                            <p>Được vận hành bởi Google Firebase Serverless</p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
