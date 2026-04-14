import { useAuth } from "@/contexts/AuthContext";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { Calendar, Mail, Shield, User, LogOut, Upload, Camera, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

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
    const { user, role, userId, refreshAuth, signOut } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
    const [savingAvatar, setSavingAvatar] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const displayName = user?.full_name || user?.email || "";
    const initial = displayName ? displayName.trim().charAt(0).toUpperCase() : "?";

    const handleLogout = async () => {
        if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
            await signOut();
            navigate("/auth");
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!userId) return;

        // Validations
        if (!file.type.startsWith("image/")) {
            toast({ title: "Lỗi", description: "Vui lòng chọn tệp hình ảnh.", variant: "destructive" });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Lỗi", description: "Kích thước ảnh không được vượt quá 5MB.", variant: "destructive" });
            return;
        }

        setSavingAvatar(true);
        setUploadProgress(0);

        try {
            // Use a specific path for the user's avatar to overwrite previous ones
            const fileExtension = file.name.split('.').pop();
            const storagePath = `avatars/${userId}/avatar.${fileExtension}`;
            const fileRef = ref(storage, storagePath);

            const uploadTask = uploadBytesResumable(fileRef, file);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error("Upload error:", error);
                    toast({ title: "Lỗi upload", description: error.message, variant: "destructive" });
                    setSavingAvatar(false);
                    setUploadProgress(null);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(fileRef);
                        await updateDoc(doc(db, "users", userId), {
                            avatar_url: downloadURL
                        });
                        await refreshAuth();
                        setAvatarUrl(downloadURL);
                        toast({ title: "Thành công", description: "Ảnh đại diện đã được cập nhật." });
                    } catch (err: any) {
                        toast({ title: "Lỗi cập nhật ảnh", description: err.message, variant: "destructive" });
                    } finally {
                        setSavingAvatar(false);
                        setUploadProgress(null);
                    }
                }
            );
        } catch (error: any) {
            console.error("Error in upload process:", error);
            toast({ title: "Lỗi", description: error.message, variant: "destructive" });
            setSavingAvatar(false);
            setUploadProgress(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    const handleClearAvatar = async () => {
        if (!userId) return;

        if (!window.confirm("Bạn có chắc chắn muốn xóa ảnh đại diện?")) return;

        setSavingAvatar(true);
        try {
            // Optional: Delete from storage if it's a firebase storage URL
            if (user?.avatar_url && user.avatar_url.includes("firebasestorage.googleapis.com")) {
                try {
                    const fileRef = ref(storage, user.avatar_url);
                    await deleteObject(fileRef);
                } catch (e) {
                    console.error("Could not delete file from storage:", e);
                    // Continue anyway to clear the URL in DB
                }
            }

            await updateDoc(doc(db, "users", userId), { avatar_url: "" });
            await refreshAuth();
            setAvatarUrl("");
            toast({ title: "Đã xóa", description: "Ảnh đại diện đã được gỡ bỏ." });
        } catch (error: any) {
            toast({ title: "Lỗi cập nhật", description: error.message || "Không thể xóa avatar", variant: "destructive" });
        } finally {
            setSavingAvatar(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-2xl mx-auto pb-36">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold">Hồ Sơ Cá Nhân</h1>
                    <p className="text-muted-foreground">Thông tin tài khoản và đổi mật khẩu</p>
                </div>
                <Button 
                    variant="outline" 
                    className="text-destructive border-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Đăng xuất
                </Button>
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
                    <div className="flex flex-col items-center justify-center py-6 space-y-4">
                        <div 
                            className={`relative h-32 w-32 rounded-full border-4 transition-all duration-300 flex items-center justify-center overflow-hidden cursor-pointer group
                                ${isDragging ? 'border-primary border-dashed bg-primary/5 scale-105' : 'border-background shadow-lg hover:border-primary/50'}
                                ${savingAvatar ? 'opacity-70 pointer-events-none' : ''}`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleFileUpload(file);
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {user?.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={displayName || "Avatar"}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="h-full w-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                                    {initial}
                                </div>
                            )}

                            {/* Hover Overlay */}
                            {!savingAvatar && (
                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <Camera className="w-8 h-8 text-white mb-1" />
                                    <span className="text-[10px] text-white font-medium uppercase tracking-wider">Đổi ảnh</span>
                                </div>
                            )}

                            {/* Uploading Spinner */}
                            {savingAvatar && uploadProgress !== null && (
                                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                                    <span className="text-xs font-bold text-primary">{Math.round(uploadProgress)}%</span>
                                </div>
                            )}
                        </div>

                        <div className="text-center space-y-1">
                            <h3 className="font-semibold text-lg">{displayName}</h3>
                            <p className="text-sm text-muted-foreground">Chạm hoặc kéo thả ảnh để thay đổi</p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2 border-primary/20 hover:bg-primary/5"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={savingAvatar}
                            >
                                <Upload className="w-4 h-4" />
                                Tải ảnh lên
                            </Button>
                            {user?.avatar_url && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive"
                                    onClick={handleClearAvatar}
                                    disabled={savingAvatar}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Xóa ảnh
                                </Button>
                            )}
                        </div>
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

            {/* Additional Logout button for mobile accessibility at the bottom */}
            <div className="pt-4 sm:hidden">
                <Button 
                    variant="destructive" 
                    className="w-full h-12 text-base font-semibold"
                    onClick={handleLogout}
                >
                    <LogOut className="w-5 h-5 mr-2" />
                    Đăng xuất khỏi hệ thống
                </Button>
            </div>
        </div>
    );
}
