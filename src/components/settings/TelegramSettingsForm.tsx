import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { MessageCircle, Bot, Users, Save, Send, RefreshCw, CheckCircle, ExternalLink, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { encryptToken, decryptToken } from "@/lib/encryption";

interface TelegramConfig {
  is_enabled: boolean;
  bot_token: string;
  group_chat_id: string;
  notify_on_dispatch: boolean;
  notify_on_incident: boolean;
  notify_on_expense: boolean;
}

const DEFAULT_CONFIG: TelegramConfig = {
  is_enabled: false,
  bot_token: "",
  group_chat_id: "",
  notify_on_dispatch: true,
  notify_on_incident: true,
  notify_on_expense: true,
};

export function TelegramSettingsForm() {
  const { toast } = useToast();
  const { tenantId } = useAuth();
  const [config, setConfig] = useState<TelegramConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Load config from Firestore on mount
  useEffect(() => {
    if (!tenantId) return;
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const snap = await getDoc(doc(db, "company_settings", tenantId));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.telegram_config) {
            const rawConfig = data.telegram_config;
            setConfig({
              ...DEFAULT_CONFIG,
              ...rawConfig,
              // Decrypt token for UI display
              bot_token: decryptToken(rawConfig.bot_token),
            });
          }
        }
      } catch (e) {
        console.error("Failed to load telegram config:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;
    setIsSaving(true);
    try {
      // Encrypt token before saving
      const encryptedConfig = {
        ...config,
        bot_token: encryptToken(config.bot_token),
        updated_at: new Date().toISOString(),
      };

      await setDoc(
        doc(db, "company_settings", tenantId),
        {
          telegram_config: encryptedConfig,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
      
      toast({
        title: "✅ Bảo mật & Đã lưu",
        description: "Cấu hình Telegram đã được mã hóa và lưu trữ an toàn.",
      });
    } catch (e: any) {
      console.error("Failed to save telegram config:", e);
      toast({
        title: "Lỗi lưu cấu hình",
        description: e?.message || "Không thể lưu cấu hình.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const token = config.bot_token.trim();
    const chatId = config.group_chat_id.trim();

    if (!token || !chatId) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập Bot Token và Chat ID nhóm riêng của bạn.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const text = `🚀 FleetPro Security Audit - Test Connection\n\n✅ Tenant: ${tenantId}\n🔒 Encryption: Active\n⏰ Time: ${new Date().toLocaleString("vi-VN")}\n\nThông báo này xác nhận Bot riêng của khách hàng đã kết nối thành công.`;

      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            disable_web_page_preview: true,
          }),
        }
      );

      const json = await response.json();
      if (json?.ok) {
        toast({
          title: "🚀 Kết nối Bot riêng thành công!",
          description: "Tin nhắn đã được gửi đến nhóm Telegram của tenant.",
        });
      } else {
        throw new Error(json?.description || "Telegram API error");
      }
    } catch (e: any) {
      toast({
        title: "❌ Lỗi kết nối Bot",
        description: "Vui lòng kiểm tra lại Token hoặc cấp quyền cho Bot trong nhóm.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          Đang tải cấu hình...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Configuration Card */}
      <Card className="border-blue-200 bg-blue-50/20 dark:bg-blue-950/20 shadow-sm">
        <CardHeader className="pb-3 border-b border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500 rounded-lg text-white">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-blue-700 dark:text-blue-300">
                  Cấu hình Telegram cho công ty
                </CardTitle>
                <CardDescription className="text-blue-600/80 dark:text-blue-400/80">
                  Nhận thông báo điều phối, sự cố & chứng từ trực tiếp vào nhóm Telegram riêng
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={config.is_enabled ? "default" : "secondary"}
              className={config.is_enabled ? "bg-green-600" : ""}
            >
              {config.is_enabled ? "Đã bật" : "Chưa bật"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-slate-900">
            <div className="space-y-0.5">
              <Label className="font-semibold">Bật thông báo Telegram</Label>
              <p className="text-xs text-muted-foreground">
                Khi tắt, tất cả thông báo Telegram sẽ bị dừng.
              </p>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(v) => setConfig((s) => ({ ...s, is_enabled: v }))}
            />
          </div>

          {/* Bot Token */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Bot className="w-4 h-4" /> Bot Token
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showToken ? "text" : "password"}
                  placeholder="7123456789:AAH-xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={config.bot_token}
                  onChange={(e) =>
                    setConfig((s) => ({ ...s, bot_token: e.target.value }))
                  }
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowToken((v) => !v)}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Để trống nếu muốn dùng bot chung mặc định của hệ thống FleetPro.
              Nếu muốn bot riêng, tạo bot mới tại{" "}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                @BotFather
              </a>
              .
            </p>
          </div>

          {/* Group Chat ID */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Chat ID nhóm công ty
            </Label>
            <Input
              placeholder="-100123456789"
              value={config.group_chat_id}
              onChange={(e) =>
                setConfig((s) => ({ ...s, group_chat_id: e.target.value }))
              }
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Tạo nhóm Telegram, thêm Bot vào nhóm, sau đó lấy Chat ID bằng{" "}
              <a
                href="https://t.me/RawDataBot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                @RawDataBot
              </a>
              . ID nhóm thường bắt đầu bằng <code className="bg-slate-100 px-1 rounded">-100...</code>
            </p>
          </div>

          {/* Notification Toggles */}
          <div className="space-y-3 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <h4 className="text-sm font-semibold mb-2">Loại thông báo gửi vào nhóm</h4>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Điều phối chuyến mới</Label>
                <p className="text-xs text-muted-foreground">Thông báo khi tài xế được giao chuyến</p>
              </div>
              <Switch
                checked={config.notify_on_dispatch}
                onCheckedChange={(v) => setConfig((s) => ({ ...s, notify_on_dispatch: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Sự cố / Báo cáo vị trí</Label>
                <p className="text-xs text-muted-foreground">Thông báo khi tài xế gửi báo cáo sự cố</p>
              </div>
              <Switch
                checked={config.notify_on_incident}
                onCheckedChange={(v) => setConfig((s) => ({ ...s, notify_on_incident: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Chi phí / Chứng từ</Label>
                <p className="text-xs text-muted-foreground">Thông báo khi tài xế nộp chứng từ chi phí</p>
              </div>
              <Switch
                checked={config.notify_on_expense}
                onCheckedChange={(v) => setConfig((s) => ({ ...s, notify_on_expense: v }))}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Lưu cấu hình
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex-1"
            >
              {isTesting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Gửi tin nhắn thử
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Guide Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Hướng dẫn nhanh (3 bước)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Tạo bot: mở{" "}
              <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                @BotFather
              </a>{" "}
              → gõ <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">/newbot</code> → lấy Token → dán vào ô trên.
            </li>
            <li>
              Tạo nhóm Telegram "Thông báo [Tên Công ty]" → thêm Bot vào → mở{" "}
              <a href="https://t.me/RawDataBot" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                @RawDataBot
              </a>{" "}
              để lấy Chat ID → dán vào ô trên.
            </li>
            <li>
              Nhấn <strong>"Gửi tin nhắn thử"</strong>. Nếu nhóm nhận được tin → hoàn tất ✅
            </li>
          </ol>
          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded text-xs text-blue-700 dark:text-blue-300">
            💡 <strong>Mẹo:</strong> Để bot gửi riêng từng tài xế, tài xế phải chat <code>/start</code> với Bot, sau đó nhập Chat ID vào hồ sơ Tài xế trong menu <strong>Quản lý Tài xế</strong>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
