import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { Lightbulb, CheckCircle2, ArrowRight, Truck, Users, MapPin, ClipboardList } from "lucide-react";

interface GuideStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tips: string[];
}

const GUIDE_CONTENT: Record<string, GuideStep> = {
  "/vehicles": {
    title: "Danh Mục Phương Tiện",
    description: "Chào mừng! Đây là nơi bạn quản lý toàn bộ đội xe của mình. Hãy bắt đầu bằng cách thêm chiếc xe đầu tiên.",
    icon: <Truck className="w-12 h-12 text-blue-500" />,
    tips: [
      "Nhập chính xác Biển số xe để hệ thống theo dõi phạt nguội tự động.",
      "Cài đặt ngày hết hạn Đăng kiểm và Bảo hiểm để nhận cảnh báo sớm.",
      "Mã xe (XE...) sẽ được tự động tạo nếu bạn để trống."
    ]
  },
  "/drivers": {
    title: "Danh Mục Tài Xế",
    description: "Quản lý hồ sơ lái xe, bằng lái và thông tin liên lạc của đội ngũ tài xế.",
    icon: <Users className="w-12 h-12 text-emerald-500" />,
    tips: [
      "Cập nhật ngày hết hạn GPLX để đảm bảo tính pháp lý khi điều phối.",
      "Gắn tài xế với xe mặc định để tăng tốc độ tạo chuyến đi.",
      "Mã tài xế (TX...) giúp bạn tìm kiếm nhanh trong các báo cáo."
    ]
  },
  "/dispatch": {
    title: "Điều Phối Vận Tải",
    description: "Trung tâm vận hành chính. Nơi bạn kết nối Đơn hàng, Xe và Tài xế thành các Chuyến đi.",
    icon: <ClipboardList className="w-12 h-12 text-orange-500" />,
    tips: [
      "Kéo thả hoặc chọn lệnh để bắt đầu điều phối.",
      "Hệ thống sẽ tự động kiểm tra xem Xe hoặc Tài xế có đang kẹt chuyến khác không.",
      "Trạng thái 'Đang đi' sẽ cho phép Tài xế cập nhật vị trí trên App Mobile."
    ]
  },
  "/tracking-center": {
    title: "Giám Sát Hành Trình",
    description: "Theo dõi vị trí thực tế và lộ trình của các chuyến đi đang thực hiện.",
    icon: <MapPin className="w-12 h-12 text-red-500" />,
    tips: [
      "Xem trực quan các xe đang ở đâu trên bản đồ.",
      "Lịch sử vị trí được lưu lại để đối chiếu với lộ trình thực tế.",
      "Nhấp vào từng xe để xem chi tiết tốc độ và trạng thái động cơ (nếu có GPS tích hợp)."
    ]
  }
};

export function GuidedTour({ path }: { path: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState<GuideStep | null>(null);

  useEffect(() => {
    if (!user) return;

    // Find first matching guide based on path prefix
    const matchingPath = Object.keys(GUIDE_CONTENT).find(p => path.startsWith(p));
    if (!matchingPath) {
      setOpen(false);
      setGuide(null);
      return;
    }

    const checkGuide = async () => {
      const userDocRef = doc(db, "users", user.id);
      const userSnap = await getDoc(userDocRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        const seenGuides = data.seen_guides || [];
        
        if (!seenGuides.includes(matchingPath)) {
          setGuide(GUIDE_CONTENT[matchingPath]);
          setOpen(true);
        }
      }
    };

    checkGuide();
  }, [path, user]);

  const handleDismiss = async () => {
    if (!user) return;
    
    const matchingPath = Object.keys(GUIDE_CONTENT).find(p => path.startsWith(p));
    if (!matchingPath) return;

    try {
      const userDocRef = doc(db, "users", user.id);
      const userSnap = await getDoc(userDocRef);
      
      let seenGuides = [];
      if (userSnap.exists()) {
        seenGuides = userSnap.data().seen_guides || [];
      }
      
      if (!seenGuides.includes(matchingPath)) {
        await updateDoc(userDocRef, {
          seen_guides: [...seenGuides, matchingPath]
        });
      }
    } catch (error) {
      console.error("Failed to update guide status:", error);
    }
    setOpen(false);
  };

  if (!guide) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md shadow-inner">
              {guide.icon}
            </div>
          </div>
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <Lightbulb className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              {guide.title}
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-base">
              {guide.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 bg-white space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Mẹo sử dụng hiệu quả
            </h4>
            <ul className="space-y-3">
              {guide.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-600 leading-relaxed shadow-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter>
            <Button 
                onClick={handleDismiss} 
                className="w-full h-12 text-base font-bold bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Tôi đã hiểu, bắt đầu thôi <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
