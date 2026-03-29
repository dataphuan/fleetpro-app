import { useAuth } from "@/contexts/AuthContext";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Shield, Calendar } from "lucide-react";

const roleLabels: Record<string, string> = {
    admin: "Quản trị viên",
    manager: "Quản lý",
    dispatcher: "Điều phối viên",
    accountant: "Kế toán",
    driver: "Tài xế",
    viewer: "Xem báo cáo",
};

const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800",
    manager: "bg-blue-100 text-blue-800",
    dispatcher: "bg-green-100 text-green-800",
    accountant: "bg-purple-100 text-purple-800",
    driver: "bg-amber-100 text-amber-800",
    viewer: "bg-gray-100 text-gray-800",
};

export default function UserProfilePage() {
    const { user, role, userId } = useAuth();

    return (
        <div className="p-6 space-y-6 max-w-2xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold">Hồ Sơ Cá Nhân</h1>
                <p className="text-muted-foreground">Thông tin tài khoản và đổi mật khẩu</p>
            </div>

            {/* User Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Thông tin tài khoản
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Họ tên</p>
                                <p className="font-medium">{user?.full_name || "—"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{user?.email || "—"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Vai trò</p>
                                <Badge className={roleColors[role] || "bg-gray-100 text-gray-800"}>
                                    {roleLabels[role] || role}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Ngày tạo</p>
                                <p className="font-medium">
                                    {user?.created_at
                                        ? new Date(user.created_at).toLocaleDateString("vi-VN")
                                        : "—"}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Change Password */}
            <ChangePasswordForm userId={userId || ""} />
        </div>
    );
}
