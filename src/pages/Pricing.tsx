import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Building2, Truck, CreditCard, ShieldCheck, MessageCircle, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { getCalApi } from "@calcom/embed-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useToast } from "@/hooks/use-toast";
import { companySettingsAdapter } from "@/lib/data-adapter";

export default function Pricing() {
    const { tenantId } = useAuth();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isMomoLoading, setIsMomoLoading] = useState(false);

    const handleDemoUpgrade = async (plan: 'basic' | 'pro') => {
        setIsProcessing(true);
        try {
            const next30Days = new Date();
            next30Days.setDate(next30Days.getDate() + 30);
            
            await companySettingsAdapter.upsert({
                id: tenantId || 'default',
                subscription: {
                    plan: plan,
                    status: 'active',
                    trial_ends_at: new Date().toISOString(),
                    next_billing_date: next30Days.toISOString()
                }
            });

            toast({
                title: "Nâng cấp Demo thành công!",
                description: `Hệ thống đã chuyển sang gói ${plan.toUpperCase()}. Các giới hạn Quota đã được mở rộng.`,
            });

            setTimeout(() => window.location.reload(), 2000);
        } catch (error: any) {
             toast({ title: "Lỗi", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };
    
    // Default bank info for payments
    const bankInfo = {
        bankName: "MB Bank (Ngân hàng Quân Đội)",
        accountNumber: "099999999999",
        accountName: "CONG TY CP CONG NGHE FLEETPRO",
        branch: "Hà Nội"
    };

    const handleUpgradeSuccess = async (details: any) => {
        setIsProcessing(true);
        try {
            const next30Days = new Date();
            next30Days.setDate(next30Days.getDate() + 30);
            
            // Update the subscription payload in the tenant's companySettings
            await companySettingsAdapter.upsert({
                id: tenantId || 'default',
                subscription: {
                    plan: 'basic',
                    status: 'active',
                    trial_ends_at: new Date().toISOString(),
                    next_billing_date: next30Days.toISOString()
                }
            });

            toast({
                title: "Thanh toán thành công!",
                description: `Cảm ơn bạn ${details.payer.name.given_name}. Lịch sử thanh toán đã lưu. Hệ thống đã mở khóa gói Basic. Vui lòng tải lại trang.`,
            });

            // Reload after 3 seconds to clear the PaywallGuard overlay
            setTimeout(() => window.location.reload(), 3000);
            
        } catch (error: any) {
            toast({
                title: "Lỗi kích hoạt",
                description: "Thanh toán thành công nhưng không thể tự động mở khóa. Vui lòng nhắn tin CSKH kèm mã đơn hàng.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMomoClick = async (plan: string) => {
        setIsMomoLoading(true);
        try {
            // Simplified Cloudflare Pages Function call (Internal redirection)
            const response = await fetch("/api/payment/momo", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    payload: JSON.stringify({
                        tenantId: tenantId || 'anonymous',
                        plan: plan,
                        redirectUrl: window.location.href
                    })
                })
            });

            if (!response.ok) {
                const errorData = await response.json() as any;
                throw new Error(errorData.message || "Lỗi tạo thanh toán MoMo");
            }

            const result = await response.json() as any;
            if (result.status === 'success' && result.payUrl) {
                // Open MoMo payment gateway
                window.location.href = result.payUrl;
            } else {
                throw new Error(result.message || "Không lấy được mã QR MoMo");
            }
        } catch (error: any) {
            toast({
                title: "Lỗi kết nối",
                description: error.message || "Không thể tạo mã MoMo lúc này. Vui lòng chuyển khoản tĩnh hoặc sử dụng PayPal.",
                variant: "destructive"
            });
        } finally {
            setIsMomoLoading(false);
        }
    };

    useEffect(() => {
        (async function () {
            const cal = await getCalApi();
            if (cal) {
                cal("ui", {
                    styles: { branding: { brandColor: "#2563eb" } },
                    hideEventTypeDetails: false,
                    layout: "month_view"
                });
            }
        })();
    }, []);

    return (
        <div className="container py-10 max-w-6xl animate-fade-in mx-auto px-4">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent sm:text-5xl mb-4">
                    Nâng Tầm Quản Lý Đội Xe Của Bạn
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Chọn gói theo quy mô xe thực tế: Free giới hạn để dùng thử nhanh, trả phí định kỳ theo số xe để mở full option, và gói cao cấp chuyển giao độc quyền cho doanh nghiệp lớn.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-start">
                
                {/* Trial Plan */}
                <Card className="relative flex flex-col h-full border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-xl">Gói Trải Nghiệm</CardTitle>
                        <CardDescription>Dành cho cá nhân muốn dùng thử</CardDescription>
                        <div className="mt-4">
                            <span className="text-4xl font-bold">0đ</span>
                            <span className="text-muted-foreground">/ 14 ngày</span>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Free: tối đa 5 xe để test đầy đủ luồng</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Quản lý tối đa 50 chuyến demo/tháng</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Tất cả tính năng Cốt lõi</li>
                            <li className="flex items-center gap-2 text-muted-foreground"><X className="h-4 w-4 shrink-0" /> Không hỗ trợ Tài khoản phụ</li>
                            <li className="flex items-center gap-2 text-muted-foreground"><X className="h-4 w-4 shrink-0" /> Không có Trợ lý AI</li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full" asChild>
                            <Link to="/">Đang sử dụng</Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* PRO Plan */}
                <Card className="relative flex flex-col h-full border-blue-500 shadow-lg shadow-blue-100 scale-105 z-10">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4">
                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                            Phổ biến nhất
                        </span>
                    </div>
                    <CardHeader>
                        <CardTitle className="text-xl text-blue-700">Gói Tiêu Chuẩn</CardTitle>
                        <CardDescription>Dành cho doanh nghiệp vừa và nhỏ</CardDescription>
                        <div className="mt-4">
                            <span className="text-4xl font-bold">499,000đ</span>
                            <span className="text-muted-foreground">/ tháng</span>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-2 font-medium"><Check className="h-4 w-4 text-blue-500 shrink-0" /> Trả phí định kỳ theo xe - mở full option</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500 shrink-0" /> Linh hoạt mở rộng theo quy mô đội xe</li>
                            <li className="flex items-center gap-2 font-medium"><Check className="h-4 w-4 text-blue-500 shrink-0" /> Không giới hạn Chuyến đi</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500 shrink-0" /> Cấp 5 tài khoản nhân viên</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500 shrink-0" /> Trợ lý AI (Gemini Flash)</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500 shrink-0" /> Hỗ trợ kỹ thuật 24/7</li>
                        </ul>
                    </CardContent>
                    <CardFooter className="flex-col gap-3">
                        <PayPalScriptProvider options={{ "clientId": import.meta.env.VITE_PAYPAL_CLIENT_ID || "sb", currency: "USD" }}>
                            <div className="w-full relative z-20">
                                <PayPalButtons 
                                    style={{ layout: "vertical", shape: "rect", height: 40 }}
                                    createOrder={(data, actions) => {
                                        return actions.order.create({
                                            intent: "CAPTURE",
                                            purchase_units: [
                                                {
                                                    description: `FleetPro Gói Tiêu Chuẩn - Tenant: ${tenantId}`,
                                                    amount: {
                                                        currency_code: "USD",
                                                        value: "20.00", // $20 MVP approx 499k VND
                                                    },
                                                },
                                            ],
                                        });
                                    }}
                                    onApprove={async (data, actions) => {
                                        if (actions.order) {
                                            const details = await actions.order.capture();
                                            handleUpgradeSuccess(details);
                                        }
                                    }}
                                    onError={(err) => {
                                        toast({
                                            title: "Lỗi kết nối PayPal",
                                            description: "Vui lòng kiểm tra lại đường truyền hoặc chuyển sang quét mã MoMo/Chuyển khoản Bank.",
                                            variant: "destructive"
                                        });
                                    }}
                                />
                            </div>
                        </PayPalScriptProvider>

                        <div className="relative w-full">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-slate-500">Hoặc thanh toán qua app</span>
                            </div>
                        </div>

                        <Button 
                            variant="outline" 
                            className="w-full border-pink-500 text-pink-600 hover:bg-pink-50" 
                            disabled={isMomoLoading}
                            onClick={() => handleMomoClick('basic')}
                        >
                            {isMomoLoading ? "Đang tạo mã QR..." : "Thanh toán bằng ví MoMo"}
                        </Button>

                        <Button 
                            variant="ghost" 
                            className="w-full text-[10px] text-slate-400 hover:text-primary"
                            onClick={() => handleDemoUpgrade('basic')}
                            disabled={isProcessing}
                        >
                            [ DEV ONLY: Kích hoạt gói Basic ngay ]
                        </Button>
                    </CardFooter>
                </Card>

                {/* ENTERPRISE Plan */}
                <Card className="relative flex flex-col h-full border-slate-200 bg-slate-50">
                    <CardHeader>
                        <CardTitle className="text-xl">Doanh Nghiệp Cao Cấp</CardTitle>
                        <CardDescription>Gói chuyển giao độc quyền theo yêu cầu doanh nghiệp</CardDescription>
                        <div className="mt-4">
                            <span className="text-4xl font-bold">Liên hệ</span>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-2 font-medium"><Check className="h-4 w-4 text-indigo-600 shrink-0" /> Không giới hạn Số lượng Xe</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0" /> Không giới hạn Tài khoản dùng chung</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0" /> Trợ lý AI (Gemini Pro) cao cấp</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0" /> Chuyển giao độc quyền (Private Deployment)</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0" /> Tích hợp API ERP nội bộ</li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            variant="outline" 
                            className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            data-cal-namespace=""
                            data-cal-link={import.meta.env.VITE_CAL_EVENT_PATH}
                            data-cal-config='{"layout":"month_view"}'
                        >
                            <Building2 className="w-4 h-4 mr-2" /> Nhận báo giá & Tư vấn
                        </Button>
                    </CardFooter>
                </Card>

            </div>
            
            <div className="mt-16 text-center text-sm text-slate-500 border-t pt-8">
                <div className="flex justify-center mb-4">
                     <ShieldCheck className="h-8 w-8 text-slate-400" />
                </div>
                <p>Hệ thống Đạt chuẩn an toàn bảo mật cấp cao. Thanh toán được SSL mã hóa 100%.</p>
                <div className="mt-4 p-4 bg-muted/50 rounded-lg max-w-xl mx-auto border flex flex-col items-center gap-2">
                    <p className="font-semibold text-slate-700">Thông tin chuyển khoản Ngân hàng</p>
                    <p>{bankInfo.accountName} - STK: <span className="font-mono font-bold text-black">{bankInfo.accountNumber}</span></p>
                    <p>Ngân hàng: {bankInfo.bankName}</p>
                </div>

                <div className="my-10 flex flex-wrap gap-4 justify-center">
                    <Button variant="outline" className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50" asChild>
                        <a href={import.meta.env.VITE_SUPPORT_ZALO_GROUP} target="_blank" rel="noreferrer">
                            <MessageCircle className="w-4 h-4" /> Group Zalo Hỗ Trợ
                        </a>
                    </Button>
                    <Button variant="outline" className="gap-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50" asChild>
                        <a href={import.meta.env.VITE_SUPPORT_FACEBOOK_GROUP} target="_blank" rel="noreferrer">
                            <MessageCircle className="w-4 h-4" /> Group Facebook Hỗ Trợ
                        </a>
                    </Button>
                    <Button variant="outline" className="gap-2 border-green-500 text-green-600 hover:bg-green-50" asChild>
                        <a href={import.meta.env.VITE_SUPPORT_WHATSAPP_GROUP} target="_blank" rel="noreferrer">
                            <MessageCircle className="w-4 h-4" /> Group WhatsApp Hỗ Trợ
                        </a>
                    </Button>
                    <Button variant="outline" className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50" asChild>
                        <a href={import.meta.env.VITE_SUPPORT_ZALO_ADMIN} target="_blank" rel="noreferrer">
                            <MessageCircle className="w-4 h-4" /> Chat trực tiếp CSKH (Zalo)
                        </a>
                    </Button>
                    <Button variant="outline" className="gap-2 border-sky-500 text-sky-600 hover:bg-sky-50" asChild>
                        <a href={import.meta.env.VITE_SUPPORT_TELEGRAM} target="_blank" rel="noreferrer">
                            <MessageCircle className="w-4 h-4" /> Liên hệ Telegram
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}
