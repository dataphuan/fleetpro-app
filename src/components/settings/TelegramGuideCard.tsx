import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ExternalLink, MessageCircle, Bot, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export const TelegramGuideCard = () => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Đã sao chép", description: text });
  };

  return (
    <Card className="border-blue-200 bg-blue-50/20 dark:bg-blue-950/20 shadow-sm">
      <CardHeader className="pb-3 border-b border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500 rounded-lg text-white">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-blue-700 dark:text-blue-300">Hướng dẫn cấu hình Telegram</CardTitle>
            <CardDescription className="text-blue-600/80 dark:text-blue-400/80">
              Nhận thông báo điều phối, báo cáo sự cố & chứng từ trực tiếp qua Telegram
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Bước 1 */}
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">1</div>
          <div className="space-y-2 flex-1">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Bot className="w-4 h-4" /> Tạo Bot trên Telegram
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vào Telegram, tìm kiếm <strong>@BotFather</strong> và gõ lệnh <code>/newbot</code>. Làm theo hướng dẫn để lấy <strong>Bot Token</strong> của bạn.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Input readOnly value="VITE_TELEGRAM_BOT_TOKEN='7123...:AAH...'" className="font-mono text-xs bg-white dark:bg-slate-900" />
            </div>
            <p className="text-xs text-blue-600 mt-1 italic">* Khai báo token này vào biến môi trường hệ thống (.env)</p>
          </div>
        </div>

        {/* Bước 2 */}
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">2</div>
          <div className="space-y-2 flex-1">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4" /> Thêm Bot vào nhóm trò chuyện
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tạo một Group Chat (ví dụ: "Thông báo FleetPro") và thêm Bot vừa tạo vào nhóm.
              Sau đó, lấy <strong>Chat ID</strong> của nhóm (thường bắt đầu bằng dấu <code>-</code> như <code>-100123...</code>).
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Input readOnly value="VITE_TELEGRAM_CHAT_ID='-100...'" className="font-mono text-xs bg-white dark:bg-slate-900" />
            </div>
            <p className="text-xs text-blue-600 mt-1 italic">* ID nhóm dùng nhận báo cáo chung. Khai báo vào môi trường (.env)</p>
          </div>
        </div>

        {/* Bước 3 */}
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">3</div>
          <div className="space-y-2 flex-1">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">Cấu hình riêng cho từng Tài xế</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Để bot gửi tin nhắn điều phối riêng cho từng ID Telegram của tài xế, tài xế phải <strong>chủ động chat /start</strong> với Bot.
              Sau đó lấy Chat ID cá nhân nhập vào hồ sơ của Tài xế trong mục <b>Quản lý Tài xế</b>.
            </p>
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-medium mb-2">Cách lấy Chat ID nhanh nhất:</p>
              <div className="flex items-center gap-2">
                <Input readOnly value="https://t.me/RawDataBot" className="font-mono text-xs w-full" />
                <Button variant="secondary" size="icon" onClick={() => window.open('https://t.me/RawDataBot', '_blank')} title="Mở RawDataBot">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
