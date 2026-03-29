import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock } from "lucide-react";

interface ChangePasswordFormProps {
    userId: string;
}

export function ChangePasswordForm({ userId }: ChangePasswordFormProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validation
            if (!oldPassword || !newPassword || !confirmPassword) {
                toast({
                    title: "Lỗi",
                    description: "Vui lòng điền đầy đủ thông tin",
                    variant: "destructive",
                });
                return;
            }

            if (newPassword.length < 8) {
                toast({
                    title: "Lỗi",
                    description: "Mật khẩu mới phải có ít nhất 8 ký tự",
                    variant: "destructive",
                });
                return;
            }

            if (newPassword !== confirmPassword) {
                toast({
                    title: "Lỗi",
                    description: "Mật khẩu mới và xác nhận không khớp",
                    variant: "destructive",
                });
                return;
            }

            if (oldPassword === newPassword) {
                toast({
                    title: "Lỗi",
                    description: "Mật khẩu mới phải khác mật khẩu hiện tại",
                    variant: "destructive",
                });
                return;
            }

            // Call Electron API
            const electronAPI = (window as any).electronAPI;
            if (!electronAPI) {
                throw new Error("Không thể kết nối Electron API");
            }

            const result = await electronAPI.auth.changePassword(userId, oldPassword, newPassword);

            if (!result.success) {
                throw new Error(result.error || "Đổi mật khẩu thất bại");
            }

            toast({
                title: "Thành công",
                description: "Mật khẩu đã được thay đổi",
            });

            // Clear form
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi";
            toast({
                title: "Đổi mật khẩu thất bại",
                description: message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-2xl">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <CardTitle>Đổi Mật Khẩu</CardTitle>
                </div>
                <CardDescription>
                    Thay đổi mật khẩu đăng nhập của bạn
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Old Password */}
                    <div className="space-y-2">
                        <Label htmlFor="oldPassword">Mật khẩu hiện tại *</Label>
                        <div className="relative">
                            <Input
                                id="oldPassword"
                                type={showOldPassword ? "text" : "password"}
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                placeholder="Nhập mật khẩu hiện tại"
                                disabled={loading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">Mật khẩu mới *</Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Nhập mật khẩu mới"
                                disabled={loading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            ℹ️ Tối thiểu 8 ký tự
                        </p>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới *</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Nhập lại mật khẩu mới"
                                disabled={loading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setOldPassword("");
                                setNewPassword("");
                                setConfirmPassword("");
                            }}
                            disabled={loading}
                        >
                            Hủy bỏ
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Đang xử lý..." : "Lưu thay đổi"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
