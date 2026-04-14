import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, AlertTriangle, Scale, CheckSquare, Search } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useBulkDeleteExpenses, useUpdateExpense } from "@/hooks/useExpenses";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

// Component Props
interface SmartExpenseAuditProps {
    expenses: any[];
    trips: any[];
    onReviewExpense: (expense: any) => void;
}

export function SmartExpenseAudit({ expenses, trips, onReviewExpense }: SmartExpenseAuditProps) {
    const queryClient = useQueryClient();
    const { mutateAsync: updateExpense } = useUpdateExpense();
    const [isConfirming, setIsConfirming] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // 1. Group pending expenses by Trip and calculate Variance
    const auditData = useMemo(() => {
        if (!expenses || !trips) return [];

        // We only care about trips that have DRAFT expenses
        const draftExpenses = expenses.filter(e => e.status === 'draft');
        const tripsWithDrafts = new Set(draftExpenses.map(e => e.trip_id).filter(Boolean));

        const reports = [];

        for (const tripId of tripsWithDrafts) {
            const trip = trips.find(t => t.id === tripId);
            if (!trip) continue;

            const route = trip.route || {};

            // All expenses for this trip (to calculate total spend vs allowance)
            const tripExpenses = expenses.filter(e => e.trip_id === tripId && e.status !== 'cancelled' && e.status !== 'rejected');
            
            // Only drafts need approval
            const pendingTripExpenses = draftExpenses.filter(e => e.trip_id === tripId);

            // Group by category to check standards
            const calcCategory = (catType: string, stdValue: number) => {
                const actual = tripExpenses.filter(e => e.category_id === catType || e.category?.category_type === catType).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                const standard = Number(stdValue) || 0;
                const pending = pendingTripExpenses.filter(e => e.category_id === catType || e.category?.category_type === catType);
                
                return {
                    actual,
                    standard,
                    variance: standard - actual, // > 0 is savings, < 0 is overspend
                    isOverspend: actual > standard && standard > 0,
                    pendingItems: pending
                };
            };

            const fuelStat = calcCategory('fuel', route.fuel_cost_standard || trip.estimated_fuel);
            const tollStat = calcCategory('toll', route.toll_cost_standard || trip.estimated_toll);
            
            // Overspend flag for the whole trip
            const hasOverspendFlag = fuelStat.isOverspend || tollStat.isOverspend;
            
            // General pending items (others like labor, maintenance) that don't have direct route limits yet
            const otherPending = pendingTripExpenses.filter(e => !['fuel', 'toll'].includes(e.category_id || e.category?.category_type));

            reports.push({
                trip,
                fuelStat,
                tollStat,
                otherPending,
                allPending: pendingTripExpenses,
                hasOverspendFlag,
                totalPendingCount: pendingTripExpenses.length
            });
        }

        // Apply filter
        const lowerQ = searchQuery.toLowerCase();
        let filtered = reports;
        if (lowerQ) {
            filtered = filtered.filter(r => r.trip.trip_code?.toLowerCase().includes(lowerQ));
        }

        // Sort: Overspend first
        return filtered.sort((a, b) => (b.hasOverspendFlag ? 1 : 0) - (a.hasOverspendFlag ? 1 : 0));

    }, [expenses, trips, searchQuery]);

    const greenTrips = auditData.filter(r => !r.hasOverspendFlag);
    const redTrips = auditData.filter(r => r.hasOverspendFlag);
    const validPendingIds = greenTrips.flatMap(r => r.allPending.map(e => e.id));

    const handleBulkConfirmGreen = async () => {
        if (validPendingIds.length === 0) return;
        setIsConfirming(true);
        try {
            for (const id of validPendingIds) {
               await updateExpense({ id, updates: { status: 'confirmed' } });
            }
            toast({ title: "Duyệt thành công", description: `Đã duyệt tự động ${validPendingIds.length} khoản chi phí hợp lệ.` });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        } catch (e: any) {
            toast({ title: "Lỗi duyệt", description: e.message, variant: 'destructive' });
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <div className="flex flex-col h-full gap-4 relative animate-fade-in">
            {/* Header / Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <Card className="bg-emerald-50 border-emerald-200">
                    <div className="p-4 flex items-center justify-between">
                        <div>
                           <p className="text-sm font-medium text-emerald-800">Chuẩn định mức (An Toàn)</p>
                           <h3 className="text-3xl font-bold text-emerald-900 mt-1">{greenTrips.length} <span className="text-sm font-normal">chuyến</span></h3>
                        </div>
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-80" />
                    </div>
               </Card>
               <Card className="bg-rose-50 border-rose-200">
                    <div className="p-4 flex items-center justify-between">
                        <div>
                           <p className="text-sm font-medium text-rose-800">Vượt định mức (Cảnh báo)</p>
                           <h3 className="text-3xl font-bold text-rose-900 mt-1">{redTrips.length} <span className="text-sm font-normal">chuyến</span></h3>
                        </div>
                        <AlertTriangle className="w-10 h-10 text-rose-500 opacity-80" />
                    </div>
               </Card>
               <Card className="bg-white border-slate-200 flex flex-col justify-center px-4">
                    <div className="flex justify-between items-center w-full">
                       <span className="text-sm font-medium text-slate-600">Đủ điều kiện tự động duyệt:</span>
                       <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{validPendingIds.length} phiếu chi</Badge>
                    </div>
                    <Button 
                       onClick={handleBulkConfirmGreen} 
                       disabled={validPendingIds.length === 0 || isConfirming}
                       className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                       <CheckSquare className="w-4 h-4 mr-2" />
                       {isConfirming ? "Đang xử lý..." : "Duyệt hàng loạt (Chỉ chuyến An toàn)"}
                    </Button>
               </Card>
            </div>

            <div className="flex justify-between items-center bg-white p-2 rounded-md border shadow-sm">
                <div className="relative w-64">
                   <Search className="w-4 h-4 absolute top-2.5 left-2.5 text-slate-400" />
                   <Input 
                      placeholder="Tìm mã chuyến..." 
                      className="pl-8 h-9 bg-slate-50 border-slate-200" 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                   />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {auditData.length === 0 ? (
                    <div className="text-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Scale className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700">Tuyệt vời! Không có chi phí chờ đối soát.</h3>
                        <p className="text-sm text-slate-500 mt-1">Tất cả chi phí đã được xác nhận hoặc chưa có phát sinh mới.</p>
                    </div>
                ) : (
                   auditData.map((report) => (
                       <Card key={report.trip.id} className={`overflow-hidden border-l-4 ${report.hasOverspendFlag ? 'border-l-rose-500 border-rose-200 shadow-sm' : 'border-l-emerald-400 border-slate-200'}`}>
                           <div className={`p-3 border-b flex justify-between items-center ${report.hasOverspendFlag ? 'bg-rose-50/50' : 'bg-slate-50'}`}>
                               <div className="flex items-center gap-3">
                                  <h4 className="font-bold font-mono text-slate-800">{report.trip.trip_code}</h4>
                                  <Badge variant="outline" className="text-xs bg-white">{report.trip.route?.route_name || 'Không rõ tuyến'}</Badge>
                               </div>
                               {report.hasOverspendFlag ? (
                                   <Badge variant="destructive" className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-none gap-1">
                                       <AlertCircle className="w-3 h-3" /> Cảnh báo chi lố
                                   </Badge>
                               ) : (
                                   <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shadow-none gap-1">
                                       <CheckCircle2 className="w-3 h-3" /> Trong định mức
                                   </Badge>
                               )}
                           </div>
                           
                           <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Fuel Variance */}
                              <div className="space-y-4">
                                  <div className="flex justify-between text-sm">
                                      <span className="font-semibold text-slate-700 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Dầu (Nhiên liệu)</span>
                                      <span className="text-slate-500">Định mức: {formatCurrency(report.fuelStat.standard)}</span>
                                  </div>
                                  
                                  {/* Progress bar representing consumption */}
                                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                      <div 
                                          className={`absolute top-0 left-0 h-full ${report.fuelStat.isOverspend ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                          style={{ width: `${Math.min((report.fuelStat.actual / (report.fuelStat.standard || 1)) * 100, 100)}%` }} 
                                      />
                                      {report.fuelStat.isOverspend && (
                                          <div className="absolute top-0 right-0 h-full w-full bg-rose-500/30" /> // Indicates overflow visually
                                      )}
                                  </div>

                                  <div className="flex justify-between text-xs mt-1">
                                      <span className="text-slate-600">Thực chi: <strong className="text-slate-800">{formatCurrency(report.fuelStat.actual)}</strong></span>
                                      {report.fuelStat.isOverspend ? (
                                          <span className="text-rose-600 font-medium">Lố: {formatCurrency(Math.abs(report.fuelStat.variance))}</span>
                                      ) : (
                                          <span className="text-emerald-600 font-medium">Dư: {formatCurrency(report.fuelStat.variance)}</span>
                                      )}
                                  </div>
                              </div>

                              {/* Toll Variance */}
                              <div className="space-y-4">
                                  <div className="flex justify-between text-sm">
                                      <span className="font-semibold text-slate-700 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Cầu đường</span>
                                      <span className="text-slate-500">Định mức: {formatCurrency(report.tollStat.standard)}</span>
                                  </div>
                                  
                                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                      <div 
                                          className={`absolute top-0 left-0 h-full ${report.tollStat.isOverspend ? 'bg-rose-500' : 'bg-blue-500'}`} 
                                          style={{ width: `${Math.min((report.tollStat.actual / (report.tollStat.standard || 1)) * 100, 100)}%` }} 
                                      />
                                  </div>

                                  <div className="flex justify-between text-xs mt-1">
                                      <span className="text-slate-600">Thực chi: <strong className="text-slate-800">{formatCurrency(report.tollStat.actual)}</strong></span>
                                      {report.tollStat.isOverspend ? (
                                          <span className="text-rose-600 font-medium">Lố: {formatCurrency(Math.abs(report.tollStat.variance))}</span>
                                      ) : (
                                          <span className="text-blue-600 font-medium">Dư: {formatCurrency(report.tollStat.variance)}</span>
                                      )}
                                  </div>
                              </div>
                           </div>

                           {/* Pending Actions List */}
                           <div className="bg-slate-50/50 p-3 pt-0">
                               <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider px-1">Phiếu chi chờ duyệt ({report.allPending.length})</p>
                               <div className="space-y-2">
                                  {report.allPending.map(exp => (
                                      <div key={exp.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-md p-2 shadow-sm hover:border-blue-200 transition-colors">
                                          <div className="flex items-center gap-3">
                                             <div className="flex flex-col">
                                                <span className="font-medium text-sm block">{exp.expense_code || 'PC-???'}</span>
                                                <span className="text-xs text-slate-500 truncate max-w-[200px]">{exp.description}</span>
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                              <span className="font-bold text-sm">{formatCurrency(exp.amount)}</span>
                                              <Button size="sm" variant={report.hasOverspendFlag ? "destructive" : "outline"} onClick={() => onReviewExpense(exp)} className="h-7 text-xs">
                                                  {report.hasOverspendFlag ? 'Soi Lỗi' : 'Duyệt thủ công'}
                                              </Button>
                                          </div>
                                      </div>
                                  ))}
                               </div>
                           </div>
                       </Card>
                   ))
                )}
            </div>
        </div>
    );
}
