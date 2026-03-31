import { useAuth } from "@/contexts/AuthContext";
import { useTrips, useUpdateTrip } from "@/hooks/useTrips";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, AlertTriangle, CheckCircle2, Package, Play, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SignaturePad } from "@/components/shared/SignaturePad";

export default function DriverDashboard() {
    const { user, tenantId } = useAuth();
    const { data: trips = [], isLoading } = useTrips();
    const { mutateAsync: updateTrip } = useUpdateTrip();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
    
    // e-POD states
    const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
    const [activeTripForSignature, setActiveTripForSignature] = useState<any>(null);

    // Store input per trip: { [tripId]: { odo: string, receiptUrl: string, isUploading: boolean } }
    const [tripInputs, setTripInputs] = useState<Record<string, { odo: string, receiptUrl: string, isUploading: boolean }>>({});

    // Here we filter trips that are NOT closed/cancelled and assigned to this driver's email or ID.
    const myActiveTrips = trips.filter((t: any) => 
        (t.driver_id === user?.email || t.driver_id === (user as any)?.uid || t.driver?.email === user?.email) &&
        ['draft', 'confirmed', 'dispatched', 'in_progress'].includes(t.status)
    );

    const handleInputChange = (tripId: string, field: 'odo'|'receiptUrl'|'isUploading', value: any) => {
        setTripInputs(prev => ({
            ...prev,
            [tripId]: { ...(prev[tripId] || { odo: '', receiptUrl: '', isUploading: false }), [field]: value }
        }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tripId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        handleInputChange(tripId, 'isUploading', true);
        try {
            const fileRef = ref(storage, `receipts/${tenantId}/${tripId}/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            handleInputChange(tripId, 'receiptUrl', downloadUrl);
            toast({ title: "Đã tải biên nhận lên!", description: "Ảnh hóa đơn đã được lưu thành công." });
        } catch (error) {
            toast({ title: "Lỗi tải ảnh", description: "Không thể lưu ảnh, vui lòng thử lại.", variant: "destructive" });
        } finally {
            handleInputChange(tripId, 'isUploading', false);
        }
    };

    const handleStartTrip = async (trip: any) => {
        setIsUpdating(true);
        try {
            await updateTrip({
                id: trip.id,
                updates: {
                    status: 'in_progress',
                    actual_departure_time: new Date().toISOString()
                }
            });
            toast({ title: "Đã bắt đầu chuyến đi", description: "Lái xe an toàn nhé!" });
        } catch (error) {
            toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái.", variant: "destructive" });
        } finally {
             setIsUpdating(false);
        }
    };

    const handleFinishTripWithSignature = (trip: any) => {
        const inputs = tripInputs[trip.id];
        if (!inputs?.odo) {
            toast({ title: "Thiếu thông tin", description: "Vui lòng nhập số KM kết thúc chuyến.", variant: "destructive" });
            return;
        }
        
        setActiveTripForSignature(trip);
        setSignatureDialogOpen(true);
    };

    const processFinalizeTrip = async (signatureDataUrl: string) => {
        if (!activeTripForSignature) return;
        const trip = activeTripForSignature;
        const inputs = tripInputs[trip.id];

        setIsUpdating(true);
        setSignatureDialogOpen(false);

        try {
            // 1. Upload Signature to Firebase Storage
            toast({ title: "Đang lưu e-POD...", description: "Đang tải chữ ký khách hàng lên hệ thống." });
            const signatureRef = ref(storage, `signatures/${tenantId}/${trip.id}/${Date.now()}_signature.png`);
            await uploadString(signatureRef, signatureDataUrl, 'data_url');
            const signatureUrl = await getDownloadURL(signatureRef);

            // 2. Finalize Trip
            await updateTrip({
                id: trip.id,
                updates: {
                    status: 'completed',
                    end_odometer: Number(inputs.odo),
                    actual_arrival_time: new Date().toISOString(),
                    // Format notes: Original + Receipt + Signature
                    notes: `${trip.notes || ''}\n[e-POD] Signature: ${signatureUrl}\n[e-POD] Receipt: ${inputs.receiptUrl || 'N/A'}`
                }
            });

            toast({ title: "HOÀN TẤT CHUYẾN ĐI", description: "Đã ký nhận và hoàn thành chuyến hàng thành công!" });
            setActiveTripForSignature(null);
        } catch (error) {
            toast({ title: "Lỗi chốt chuyến", description: "Không thể lưu e-POD. Vui lòng thử lại.", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return <div className="p-4 text-center mt-10">Đang tải dữ liệu chuyến đi...</div>;
    }

    if (myActiveTrips.length === 0) {
        return (
            <div className="p-6 flex flex-col items-center justify-center text-center mt-20">
                <div className="bg-slate-200 p-4 rounded-full mb-4">
                    <Package className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-700">Chưa có chuyến</h2>
                <p className="text-slate-500 mt-2">Tuyệt vời! Hiện tại bạn không có chuyến đi nào được phân công. Hãy nghỉ ngơi.</p>
            </div>
        );
    }

    return (
        <div className="p-4 pb-24 space-y-4">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Chuyến đi của bạn</h2>
                <p className="text-sm text-slate-500">Kéo xuống để xem tất cả ({myActiveTrips.length} chuyến)</p>
            </div>

            {myActiveTrips.map(trip => (
                <Card key={trip.id} className="border-blue-100 shadow-md">
                    <CardHeader className="pb-2 bg-blue-50 focus:bg-blue-100 rounded-t-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg text-blue-900">{trip.trip_code}</CardTitle>
                                <CardDescription className="text-blue-700 font-medium mt-1">
                                    {trip.vehicle?.license_plate || trip.vehicle_id || "Chưa xếp xe"}
                                </CardDescription>
                            </div>
                            <Badge variant={trip.status === 'in_progress' ? 'default' : 'secondary'} className="text-xs">
                                {trip.status === 'in_progress' ? 'ĐANG CHẠY' : (trip.status === 'dispatched' ? 'CHỜ ĐI' : 'LÊN LỊCH')}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Khách hàng:</span>
                            <span className="font-semibold">{trip.customer?.name || trip.customer_id || "Khách Vãng Lai"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Tuyến đường:</span>
                            <span className="font-semibold max-w-[200px] text-right truncate">{trip.route_id || "Chưa rõ"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Hàng hóa:</span>
                            <span className="font-medium">{trip.cargo_description || "N/A"} - {trip.cargo_weight_tons || 0} Tấn</span>
                        </div>
                        
                        {trip.status === 'in_progress' && (
                            <div className="mt-4 p-3 bg-amber-50 rounded-md border border-amber-100 space-y-2">
                                <Label className="text-xs text-amber-800 font-semibold">CẬP NHẬT TRẠNG THÁI (TRẢ HÀNG)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="Nhập số KM thực tế..." 
                                    className="bg-white" 
                                    value={tripInputs[trip.id]?.odo || ''}
                                    onChange={(e) => handleInputChange(trip.id, 'odo', e.target.value)}
                                />
                                <div className="flex items-center gap-2 mt-2">
                                    <Button variant="outline" className="w-full bg-white border-slate-300 text-slate-700 cursor-pointer relative overflow-hidden" disabled={tripInputs[trip.id]?.isUploading}>
                                        {tripInputs[trip.id]?.isUploading ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải lên...</>
                                        ) : tripInputs[trip.id]?.receiptUrl ? (
                                            <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Đã lưu Hóa đơn</>
                                        ) : (
                                            <><Camera className="w-4 h-4 mr-2" /> Chụp hóa đơn / Bill</>
                                        )}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            capture="environment" 
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => handleFileUpload(e, trip.id)}
                                            disabled={tripInputs[trip.id]?.isUploading}
                                        />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    
                    <CardFooter className="pt-2">
                        {trip.status === 'in_progress' ? (
                            <div className="flex gap-2 w-full">
                                <Button className="w-full bg-green-600 hover:bg-green-700 font-bold py-6 text-lg" disabled={isUpdating || tripInputs[trip.id]?.isUploading} onClick={() => handleFinishTripWithSignature(trip)}>
                                    <CheckCircle2 className="w-5 h-5 mr-3" /> CHỐT CHUYẾN & KÝ NHẬN
                                </Button>
                                <Button variant="destructive" size="icon" disabled={isUpdating} onClick={() => alert('Chức năng báo sự cố')}>
                                    <AlertTriangle className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6" 
                                onClick={() => handleStartTrip(trip)}
                                disabled={isUpdating}
                            >
                                <Play className="w-5 h-5 mr-2" /> BẮT ĐẦU CHẠY
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            ))}

            {/* Signature Dialog */}
            <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
                <DialogContent className="max-w-[95%] sm:max-w-md bg-slate-50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Navigation className="w-5 h-5 text-green-600" />
                            Xác nhận Giao hàng (e-POD)
                        </DialogTitle>
                        <DialogDescription>
                            Vui lòng yêu cầu khách hàng ký xác nhận đã nhận đủ hàng hóa cho chuyến: <strong>{activeTripForSignature?.trip_code}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <SignaturePad 
                        onSave={processFinalizeTrip} 
                        onCancel={() => {
                            setSignatureDialogOpen(false);
                            setActiveTripForSignature(null);
                        }} 
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
