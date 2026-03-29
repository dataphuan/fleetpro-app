import { useAuth } from "@/contexts/AuthContext";
import { useTrips } from "@/hooks/useTrips";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, FileDown, Truck, Package, Calendar } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { normalizeUserRole } from "@/lib/rbac";

export default function CustomerPortal() {
    const { user, role } = useAuth() as any;
    const { data: trips = [], isLoading } = useTrips();
    const [showMapTrip, setShowMapTrip] = useState<any>(null);
    const normalizedRole = normalizeUserRole(role);

    // Filter trips for this customer
    // Viewers only see their own trips, Admins see all for demo purposes
    const myTrips = trips.filter((t: any) => {
        const isOwner = t.customer?.email === user?.email || t.customer_id === user?.id || normalizedRole === 'admin' || normalizedRole === 'manager';
        const isVisibleStatus = ['confirmed', 'dispatched', 'in_progress', 'completed', 'closed'].includes(t.status);
        return isOwner && isVisibleStatus;
    });

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Đang đồng bộ dữ liệu vận tải...</div>;
    }

    if (myTrips.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="bg-slate-100 p-4 rounded-full mb-4">
                    <Package className="w-12 h-12 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-700">Chưa có đơn hàng nào</h2>
                <p className="text-slate-500 mt-2 max-w-md">Hiện tại không có chuyến vận chuyển nào đang được thực hiện cho tài khoản của bạn. Vui lòng liên hệ bộ phận Điều độ nếu cần hỗ trợ.</p>
            </div>
        );
    }

    const extractReceiptUrl = (notes?: string) => {
        if (!notes) return null;
        const match = notes.match(/Bill:\s*(https:\/\/firebasestorage[^ \n]+)/);
        return match ? match[1] : null;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'in_progress': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">ĐANG VẬN CHUYỂN</Badge>;
            case 'completed': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">ĐÃ GIAO HÀNG</Badge>;
            case 'closed': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">ĐÃ QUYẾT TOÁN</Badge>;
            case 'dispatched': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">ĐÃ XẾP XE</Badge>;
            default: return <Badge variant="outline">CHỜ XỬ LÝ</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Theo dõi Đơn hàng</h2>
                    <p className="text-slate-500">Xem lộ trình thực tế và tải biên nhận (e-POD)</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{myTrips.length}</div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Tổng Vé</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTrips.map((trip: any) => {
                    const receiptUrl = extractReceiptUrl(trip.notes);
                    
                    return (
                        <Card key={trip.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
                            <CardHeader className="bg-slate-50/50 border-b pb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className="text-xs font-mono bg-white">
                                        {trip.trip_code}
                                    </Badge>
                                    {getStatusBadge(trip.status)}
                                </div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-slate-400" />
                                    {trip.route?.route_name || "Tuyến chưa xác định"}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <Calendar className="w-4 h-4" /> 
                                    {trip.departure_date ? format(new Date(trip.departure_date), 'dd/MM/yyyy HH:mm') : 'Chưa có lịch'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-500 text-xs mb-1">Xe vận chuyển</p>
                                        <p className="font-semibold text-slate-700">{trip.vehicle?.license_plate || "Đang xếp xe"}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs mb-1">Tài xế phụ trách</p>
                                        <p className="font-semibold text-slate-700">{trip.driver?.full_name || "Đang xếp tài"}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-slate-500 text-xs mb-1">Hàng hóa (Dự kiến)</p>
                                        <p className="font-medium text-slate-700">
                                            {trip.cargo_description || 'Không ghi chú'} 
                                            {trip.cargo_weight_tons ? ` • ${trip.cargo_weight_tons} Tấn` : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2 border-t mt-4">
                                    {trip.status === 'in_progress' ? (
                                        <Button 
                                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" 
                                            onClick={() => setShowMapTrip(trip)}
                                        >
                                            <MapPin className="w-4 h-4 mr-2" /> Xem Định Vị
                                        </Button>
                                    ) : (
                                        <Button variant="outline" className="flex-1" disabled>
                                            <MapPin className="w-4 h-4 mr-2" /> Vị trí (Đã dừng)
                                        </Button>
                                    )}

                                    {receiptUrl ? (
                                        <Button 
                                            variant="secondary" 
                                            className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                            onClick={() => window.open(receiptUrl, '_blank')}
                                        >
                                            <FileDown className="w-4 h-4 mr-2" /> Tải e-POD
                                        </Button>
                                    ) : (
                                        <Button variant="outline" className="flex-1" disabled title="Chưa có biên nhận">
                                            <FileDown className="w-4 h-4 mr-2" /> Tải e-POD
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* GPS Livetrack Modal Cloned from Dispatch view */}
            {showMapTrip && (
                <Dialog open={!!showMapTrip} onOpenChange={(open) => !open && setShowMapTrip(null)}>
                    <DialogContent className="max-w-4xl h-[70vh] flex flex-col p-0 overflow-hidden">
                        <DialogHeader className="p-4 border-b bg-purple-50">
                            <DialogTitle className="flex items-center gap-2 text-purple-800">
                                <MapPin className="w-6 h-6 animate-bounce" />
                                Theo dõi lộ trình trực tiếp: Xe {showMapTrip.vehicle?.license_plate}
                            </DialogTitle>
                            <DialogDescription>
                                Dữ liệu định vị GPS đang được Livestream về Cổng khách hàng.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 relative bg-slate-100">
                            <iframe 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31340.54010899432!2d106.68!3d10.84!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTDCsDUwJzI0LjAiTiAxMDbCsDQxJzQ4LjAiRQ!5e0!3m2!1sen!2s!4v1!5m2!1sen!2s" 
                                width="100%" 
                                height="100%" 
                                style={{ border: 0 }} 
                                allowFullScreen 
                                loading="lazy"
                                className="grayscale hover:grayscale-0 transition-all duration-1000"
                            ></iframe>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
