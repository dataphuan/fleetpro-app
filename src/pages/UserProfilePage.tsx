import { useAuth } from "@/contexts/AuthContext";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Calendar, Mail, Shield, User } from "lucide-react";
import { useState } from "react";

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
    const { user, role, userId, refreshAuth } = useAuth();
    const { toast } = useToast();
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
    const [savingAvatar, setSavingAvatar] = useState(false);
    const displayName = user?.full_name || user?.email || "";
    const initial = displayName ? displayName.trim().charAt(0).toUpperCase() : "?";

    const isValidAvatarUrl = (value: string) => {
        if (!value) return true;
        try {
            const url = new URL(value);
            if (url.protocol !== "http:" && url.protocol !== "https:") return false;
            return /\.(png|jpg|jpeg)$/i.test(url.pathname);
        } catch {
            return false;
        }
    };

    const handleSaveAvatar = async () => {
        if (!userId) {
            toast({ title: "Lỗi", description: "Không tìm thấy tài khoản hiện tại.", variant: "destructive" });
            return;
        }

        if (!isValidAvatarUrl(avatarUrl.trim())) {
            toast({
                title: "URL không hợp lệ",
                description: "Chỉ chấp nhận http/https và định dạng .jpg hoặc .png",
                variant: "destructive"
            });
            return;
        }

        setSavingAvatar(true);
        try {
            await updateDoc(doc(db, "users", userId), {
                avatar_url: avatarUrl.trim()
            });
            await refreshAuth();
            toast({ title: "Đã lưu", description: "Ảnh đại diện đã được cập nhật." });
        } catch (error: any) {
            toast({ title: "Lỗi cập nhật", description: error.message || "Không thể lưu avatar", variant: "destructive" });
        } finally {
            setSavingAvatar(false);
        }
    };

    const handleClearAvatar = async () => {
        setAvatarUrl("");
        if (!userId) return;

        setSavingAvatar(true);
        try {
            await updateDoc(doc(db, "users", userId), { avatar_url: "" });
            await refreshAuth();
            toast({ title: "Đã xóa", description: "Ảnh đại diện đã được gỡ bỏ." });
        } catch (error: any) {
            toast({ title: "Lỗi cập nhật", description: error.message || "Không thể xóa avatar", variant: "destructive" });
        } finally {
            setSavingAvatar(false);
        }
    };

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
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                            {user?.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={displayName || "Avatar"}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <span className="text-lg font-semibold text-primary">{initial}</span>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Ảnh đại diện</p>
                            <p className="text-sm font-medium break-all">
                                {user?.avatar_url || "Chưa cấu hình"}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="avatar_url">URL ảnh đại diện</Label>
                            <Input
                                id="avatar_url"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                placeholder="https://.../avatar.jpg"
                            />
                            {!isValidAvatarUrl(avatarUrl.trim()) && (
                                <p className="text-xs text-destructive">Chỉ chấp nhận http/https và đuôi .jpg hoặc .png</p>
                            )}
                        </div>
                        <Button onClick={handleSaveAvatar} disabled={savingAvatar || !isValidAvatarUrl(avatarUrl.trim())}>
                            {savingAvatar ? "Đang lưu..." : "Lưu avatar"}
                        </Button>
                        <Button variant="outline" onClick={handleClearAvatar} disabled={savingAvatar}>
                            Xóa avatar
                        </Button>
                    </div>
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
