import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Building2, Truck, CreditCard, ShieldCheck, MessageCircle, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { getCalApi } from "@calcom/embed-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useToast } from "@/hooks/use-toast";
import { companySettingsAdapter } from "@/lib/data-adapter";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

export default function Pricing() {
    const { tenantId } = useAuth();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isMomoLoading, setIsMomoLoading] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // MoMo Frontend Webhook Interceptor (Safeguard)
    useEffect(() => {
        const resultCode = searchParams.get("resultCode");
        const orderId = searchParams.get("orderId");
        if (resultCode && orderId) {
            // Clean the URL immediately to prevent duplicate triggers on reload
            searchParams.delete("resultCode");
            searchParams.delete("orderId");
            setSearchParams(searchParams, { replace: true });

            if (resultCode === "0") {
                 toast({
                     title: "Giao dịch đang được xử lý",
                     description: "Server đang xác thực giao dịch từ MoMo. Nếu giao dịch thành công, gói cước sẽ tự động kích hoạt trong ít phút. Vui lòng làm mới trang (F5) nếu chưa thấy sự thay đổi.",
                 });
                 // Note: We NO LONGER call companySettingsAdapter.upsert() here.
                 // The Webhook (functions/api/payment/webhook.ts) handles the DB update securely.
            } else {
                 toast({
                     title: "Trạng thái giao dịch",
                     description: `Thanh toán chưa hoàn tất (Mã trạng thái: ${resultCode}). Vui lòng thử lại.`,
                     variant: "destructive"
                 });
            }
        }
    }, [searchParams, setSearchParams, toast]);

    const handleDemoUpgrade = async (plan: string) => {
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
        bankName: "Techcombank (NH TMCP Kỹ Thương VN)",
        accountNumber: "8486 568 666",
        accountName: "TRAN NGOC CHUYEN",
        branch: ""
    };

    const handleUpgradeSuccess = async (details: any) => {
        // Now mostly used for UI feedback after server verification
        toast({
            title: "Thanh toán thành công!",
            description: `Cảm ơn bạn ${details.payer?.name?.given_name || 'đã thanh toán'}. Giao dịch đang được Server xác thực. Vui lòng đợi trong giây lát...`,
        });

        // Reload after 3 seconds to clear the PaywallGuard overlay and fetch new settings
        setTimeout(() => window.location.reload(), 3000);
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
                            <span className="text-muted-foreground">/ 5 ngày</span>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> <strong>KHÔNG GIỚI HẠN XE</strong> trong 5 ngày dùng thử</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Không giới hạn số chuyến</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Tất cả tính năng Cốt lõi</li>
                            <li className="flex items-center gap-2 text-muted-foreground"><X className="h-4 w-4 shrink-0" /> Không hỗ trợ Tài khoản phụ</li>
                            <li className="flex items-center gap-2 text-muted-foreground"><X className="h-4 w-4 shrink-0" /> Không có Trợ lý AI</li>
                            <li className="flex items-center gap-2 text-amber-600 font-medium"><Info className="h-4 w-4 shrink-0" /> Sau 5 ngày: Hạn chế theo gói đăng ký</li>
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
                        <CardTitle className="text-xl text-blue-700">Gói Chuyên Nghiệp</CardTitle>
                        <CardDescription>Dành cho doanh nghiệp vừa</CardDescription>
                        <div className="mt-4">
                            <span className="text-4xl font-bold">567,000đ</span>
                            <span className="text-muted-foreground">/ tháng</span>
                            <div className="text-xs text-blue-600 mt-1">✓ 6.8M/năm (tiết kiệm ~1M)</div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-2 font-medium"><Check className="h-4 w-4 text-blue-500 shrink-0" /> Xe: Max 50 chiếc - full option</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500 shrink-0" /> Không giới hạn Chuyến đi</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500 shrink-0" /> Cấp 10 tài khoản nhân viên</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500 shrink-0" /> Trợ lý AI (Gemini Flash)</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500 shrink-0" /> Hỗ trợ kỹ thuật 24/7</li>
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
                                                    description: `FleetPro Gói Chuyên Nghiệp - Tenant: ${tenantId}`,
                                                    amount: {
                                                        currency_code: "USD",
                                                        value: "23.00", // ~567k VND per month
                                                    },
                                                },
                                            ],
                                        });
                                    }}
                                    onApprove={async (data, actions) => {
                                        if (actions.order) {
                                            const details = await actions.order.capture();
                                            
                                            // Secure: Call Server-side verification instead of client-side upgrade
                                            setIsProcessing(true);
                                            try {
                                                const response = await fetch("/api/payment/paypal-verify", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        orderID: data.orderID,
                                                        tenantId: tenantId || 'default'
                                                    })
                                                });

                                                if (!response.ok) {
                                                    const errData = await response.json() as any;
                                                    throw new Error(errData.message || "Lỗi xác thực PayPal tại Server");
                                                }

                                                handleUpgradeSuccess(details);
                                            } catch (error: any) {
                                                toast({
                                                    title: "Lỗi đồng bộ",
                                                    description: error.message || "PayPal đã trừ tiền nhưng server chưa thể cập nhật. Vui lòng liên hệ Admin.",
                                                    variant: "destructive"
                                                });
                                            } finally {
                                                setIsProcessing(false);
                                            }
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
                            onClick={() => handleMomoClick('professional')}
                        >
                            {isMomoLoading ? "Đang tạo mã QR..." : "Thanh toán bằng ví MoMo"}
                        </Button>

                        <Button 
                            variant="ghost" 
                            className="w-full text-[10px] text-slate-400 hover:text-primary"
                            onClick={() => handleDemoUpgrade('professional')}
                            disabled={isProcessing}
                        >
                            [ DEV ONLY: Kích hoạt gói PRO ngay ]
                        </Button>
                    </CardFooter>
                </Card>

                {/* BUSINESS Plan */}
                <Card className="relative flex flex-col h-full border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/50">
                    <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 px-3 py-1 rounded-full text-[11px] font-bold uppercase">
                        VIP
                    </div>
                    <CardHeader>
                        <CardTitle className="text-xl text-amber-900">Gói Business - Thương Hiệu Riêng</CardTitle>
                        <CardDescription>Chuyển giao độc quyền + Tư vấn triển khai</CardDescription>
                        <div className="mt-4">
                            <span className="text-4xl font-bold text-amber-700">Tùy thỏa thuận</span>
                            <div className="text-xs text-amber-600 mt-2">Dựa trên quy mô doanh nghiệp</div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-2 font-medium"><Check className="h-4 w-4 text-amber-600 shrink-0" /> Không giới hạn Số lượng Xe</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-amber-600 shrink-0" /> Unlimited Tài khoản + Custom roles</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-amber-600 shrink-0" /> White Label Branding (tên + logo)</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-amber-600 shrink-0" /> AI (Gemini Pro) không giới hạn</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-amber-600 shrink-0" /> Private Deployment (on-premise)</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-amber-600 shrink-0" /> Tích hợp API ERP + Custom</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-amber-600 shrink-0" /> Dedicated Customer Success Manager</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-amber-600 shrink-0" /> Tư vấn triển khai miễn phí</li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            variant="default" 
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                            data-cal-namespace=""
                            data-cal-link="fleetpro-app/30min"
                            data-cal-config='{"layout":"month_view"}'
                        >
                            <Building2 className="w-4 h-4 mr-2" /> Đặt Hẹn Tư Vấn (30 phút)
                        </Button>
                    </CardFooter>
                </Card>

            </div>
            
            <div className="mt-16 text-center text-sm text-slate-500 border-t pt-8">
                <div className="flex justify-center mb-4">
                     <ShieldCheck className="h-8 w-8 text-slate-400" />
                </div>
                <p>Hệ thống Đạt chuẩn an toàn bảo mật cấp cao. Thanh toán được SSL mã hóa 100%.</p>
                <div className="mt-4 p-4 bg-muted/50 rounded-lg max-w-xl mx-auto border flex flex-col md:flex-row items-center gap-6">
                    <img 
                        src={`https://img.vietqr.io/image/TCB-8486568666-compact2.png?amount=567000&addInfo=FleetPro%20${tenantId}&accountName=TRAN%20NGOC%20CHUYEN`} 
                        alt="QR Code Thanh Toán" 
                        className="w-48 h-48 bg-white p-2 rounded-lg shadow-sm border"
                    />
                    <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
                        <p className="font-semibold text-slate-700 text-lg">Thông tin chuyển khoản Ngân hàng</p>
                        <p className="text-slate-600">👤 Tên TK: <span className="font-bold text-black uppercase">{bankInfo.accountName}</span></p>
                        <p className="text-slate-600">🏦 Số TK: <span className="font-mono text-xl font-bold text-blue-600">{bankInfo.accountNumber}</span></p>
                        <p className="text-slate-600">🏛️ Ngân hàng: <span className="font-medium text-black">{bankInfo.bankName}</span></p>
                        <p className="text-sm text-amber-600 mt-2 bg-amber-50 p-2 rounded w-full border border-amber-100">
                            💡 Sau khi quét mã CK, vui lòng chụp màn hình gửi Zalo Admin (0989.890.022) để được kích hoạt VIP lập tức.
                        </p>
                    </div>
                </div>

                <div className="my-10 flex flex-wrap gap-4 justify-center">
                    <Button variant="outline" className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50" asChild>
                        <a href="https://zalo.me/0989890022" target="_blank" rel="noreferrer">
                            <MessageCircle className="w-4 h-4" /> Liên hệ Admin (Zalo/Viber)
                        </a>
                    </Button>
                    <Button variant="outline" className="gap-2 border-slate-500 text-slate-700 hover:bg-slate-50" asChild>
                        <a href="mailto:contact@tnc.io.vn">
                            <MessageCircle className="w-4 h-4" /> Email: contact@tnc.io.vn
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}
