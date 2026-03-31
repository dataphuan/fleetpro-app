import { 
    Sheet, 
    SheetContent, 
    SheetDescription, 
    SheetHeader, 
    SheetTitle 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Sparkles, 
    ArrowRightLeft, 
    Merge, 
    Truck, 
    Calendar,
    Check
} from "lucide-react";

export type SuggestionType = 'consolidation' | 'backhaul';

export interface AISuggestion {
    id: string;
    type: SuggestionType;
    title: string;
    description: string;
    confidence: number;
    trips: any[];
    savings: string;
    logic: string;
}

interface AISuggestionDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    suggestions: AISuggestion[];
    isLoading: boolean;
    onAccept?: (suggestion: AISuggestion) => void;
    onReject?: (suggestion: AISuggestion) => void;
}

export const AISuggestionDrawer = ({ open, onOpenChange, suggestions, isLoading, onAccept, onReject }: AISuggestionDrawerProps) => {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col">
                <SheetHeader className="p-6 bg-indigo-600 text-white">
                    <SheetTitle className="text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Trợ lý Điều phối AI (Gemini)
                    </SheetTitle>
                    <SheetDescription className="text-indigo-100">
                        Phân tích vượn trên {suggestions.length} chuyến vận tải hiện có.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 space-y-4">
                            <Truck className="w-10 h-10 text-indigo-400 animate-bounce" />
                            <p className="text-sm text-muted-foreground animate-pulse">Đang quét kịch bản tối ưu...</p>
                        </div>
                    ) : suggestions.length === 0 ? (
                        <div className="text-center py-20 px-4">
                            <p className="text-muted-foreground">Không tìm thấy cơ hội tối ưu nào cho ngày hôm nay.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {suggestions.map((s) => (
                                <div key={s.id} className="border rounded-xl overflow-hidden hover:border-indigo-300 transition-colors bg-white shadow-sm">
                                    <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            {s.type === 'consolidation' ? (
                                                <Merge className="w-4 h-4 text-orange-500" />
                                            ) : (
                                                <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                                            )}
                                            <span className="font-bold text-sm uppercase tracking-tighter">
                                                {s.type === 'consolidation' ? 'Gom Chuyến' : 'Kịch Bản Chiều Về'}
                                            </span>
                                        </div>
                                        <Badge className="bg-indigo-100 text-indigo-700">Độ tin cậy: {s.confidence}%</Badge>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <h4 className="font-semibold text-slate-800">{s.title}</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">{s.description}</p>
                                        
                                        <div className="bg-emerald-50 p-2 rounded text-[10px] text-emerald-700 font-medium flex items-center gap-2">
                                            <Sparkles className="w-3 h-3" />
                                            Tiết kiệm ước tính: {s.savings}
                                        </div>

                                        <div className="pt-4 flex gap-2">
                                            <Button size="sm" className="flex-1 bg-indigo-600" onClick={() => onAccept?.(s)}>
                                                <Check className="w-4 h-4 mr-2" /> Chấp nhận
                                            </Button>
                                            <Button size="sm" variant="outline" className="flex-1" onClick={() => onReject?.(s)}>
                                                Hủy
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
};
