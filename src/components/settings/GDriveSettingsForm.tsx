import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Cloud, Link2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export function GDriveSettingsForm() {
    const { toast } = useToast();
    const { userId, tenantId } = useAuth();
    const [projectId, setProjectId] = useState(import.meta.env.VITE_FIREBASE_PROJECT_ID || "");
    const [authDomain, setAuthDomain] = useState(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "");
    const [storageBucket, setStorageBucket] = useState(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "");
    const [cloudflareSite, setCloudflareSite] = useState(localStorage.getItem('cloudflare_site') || "");
    const [lastHealth, setLastHealth] = useState<string>("");

    const isConfigured = useMemo(() => {
        return Boolean(projectId && authDomain && storageBucket);
    }, [projectId, authDomain, storageBucket]);

    const handleSaveCloudProfile = () => {
        localStorage.setItem('cloudflare_site', cloudflareSite);
        localStorage.setItem('firebase_project_id', projectId);
        localStorage.setItem('firebase_auth_domain', authDomain);
        localStorage.setItem('firebase_storage_bucket', storageBucket);
        toast({ title: "Đã lưu cấu hình đám mây", description: "Cấu hình Cloudflare + Firebase đã được lưu trên trình duyệt hiện tại." });
    };

    const handleCheckConnection = async () => {
        try {
            if (!userId) {
                setLastHealth('Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập trước.');
                toast({ title: "Không tìm thấy phiên", description: "Vui lòng đăng nhập trước khi kiểm tra trạng thái cloud.", variant: 'destructive' });
                return;
            }

            const userSnap = await getDoc(doc(db, 'users', userId));
            if (!userSnap.exists()) {
                setLastHealth(`Thiếu users/${userId} trên Firestore`);
                toast({ title: "Lỗi bảng users", description: `Không tìm thấy users/${userId} trên Firestore.`, variant: 'destructive' });
                return;
            }

            const resolvedTenant = String(userSnap.data().tenant_id || tenantId || '');
            if (!resolvedTenant) {
                setLastHealth('Thiếu tenant_id trong hồ sơ người dùng/phiên đăng nhập');
                toast({ title: "Lỗi ánh xạ tenant", description: "Không tìm thấy tenant_id cho người dùng hiện tại.", variant: 'destructive' });
                return;
            }

            const tenantSnap = await getDoc(doc(db, 'tenants', resolvedTenant));
            if (!tenantSnap.exists()) {
                setLastHealth(`Thiếu tenants/${resolvedTenant} trên Firestore`);
                toast({ title: "Lỗi bảng tenant", description: `Không tìm thấy tenants/${resolvedTenant}.`, variant: 'destructive' });
                return;
            }

            const plan = String(tenantSnap.data().plan || tenantSnap.data().plan_code || 'default');
            setLastHealth(`Kết nối tenant thành công: ${resolvedTenant} | gói=${plan} | dự án=${projectId || 'n/a'}`);
            toast({ title: "Kết nối online thành công", description: "Đã kết nối Firebase Auth + Firestore theo tenant." });
        } catch (error: any) {
            setLastHealth(`Lỗi kết nối Firebase: ${error?.message || 'không rõ nguyên nhân'}`);
            toast({ title: "Lỗi kết nối", description: error?.message || 'Không thể kết nối backend Firebase', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-blue-500" />
                        Cấu hình online (Cloudflare + Firebase)
                    </CardTitle>
                    <CardDescription>
                        Chế độ production: Cloudflare Pages + Firebase Auth + Firestore + Storage (không dùng GAS runtime).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="projectId">Firebase Project ID</Label>
                            <Input
                                id="projectId"
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                placeholder="fleetpro-app"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="authDomain">Firebase Auth Domain</Label>
                            <Input
                                id="authDomain"
                                value={authDomain}
                                onChange={(e) => setAuthDomain(e.target.value)}
                                placeholder="fleetpro-app.firebaseapp.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="storageBucket">Firebase Storage Bucket</Label>
                            <Input
                                id="storageBucket"
                                value={storageBucket}
                                onChange={(e) => setStorageBucket(e.target.value)}
                                placeholder="fleetpro-app.firebasestorage.app"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cloudflareSite">URL Cloudflare Pages (tuỳ chọn)</Label>
                            <Input
                                id="cloudflareSite"
                                value={cloudflareSite}
                                onChange={(e) => setCloudflareSite(e.target.value)}
                                placeholder="https://your-site.pages.dev"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-200 text-sm text-blue-800">
                                <p className="font-semibold mb-1">Luồng online khuyến nghị (không dùng GAS runtime):</p>
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>Thiết lập biến môi trường Firebase trong Cloudflare Pages (Production + Preview).</li>
                                    <li>Đảm bảo users/{'{'}uid{'}'}.tenant_id và tenants/{'{'}tenant_id{'}'} tồn tại đúng dữ liệu.</li>
                                    <li>Triển khai Firestore rules/indexes trước khi mở traffic.</li>
                                    <li>Chạy lint/typecheck/build + security gate trước khi go-live.</li>
                                </ol>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button onClick={handleSaveCloudProfile} variant="outline">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Lưu hồ sơ cloud
                                </Button>
                                <Button onClick={handleCheckConnection} className="bg-blue-600 hover:bg-blue-700">
                                    <Link2 className="w-4 h-4 mr-2" />
                                    Kiểm tra kết nối tenant
                                </Button>
                            </div>

                            {lastHealth && (
                                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                    {lastHealth}
                                </div>
                            )}

                            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                Trạng thái cấu hình: {isConfigured ? 'SẴN SÀNG' : 'THIẾU TRƯỜNG BẮT BUỘC'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
