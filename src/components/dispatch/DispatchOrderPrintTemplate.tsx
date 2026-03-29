import { Trip } from "@/types/database.types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatCurrency } from "@/lib/formatters";

interface DispatchOrderPrintTemplateProps {
    trip: Trip;
}

export function DispatchOrderPrintTemplate({ trip }: DispatchOrderPrintTemplateProps) {
    // Access related data
    const vehicle = trip.vehicle as any;
    const driver = trip.driver as any;
    const route = trip.route as any;
    const customer = trip.customer as any;

    return (
        <div className="print-template hidden print:block">
            <div className="p-8 max-w-4xl mx-auto bg-white text-black">
                {/* Header */}
                <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold mb-2">CÔNG TY VẬN TẢI SAVACO</h1>
                    <p className="text-sm text-gray-600">Địa chỉ: TP. Hồ Chí Minh | SĐT: 0901234567</p>
                </div>

                {/* Title */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold uppercase mb-2">PHIẾU ĐIỀU XE</h2>
                    <p className="text-lg">Mã: <span className="font-bold">{trip.trip_code}</span></p>
                </div>

                {/* Main Info Grid */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                        <div className="border-b border-gray-300 pb-2">
                            <h3 className="font-bold text-lg mb-2">📅 THÔNG TIN CHUYẾN ĐI</h3>
                            <div className="space-y-1 text-sm">
                                <p><span className="font-semibold">Ngày khởi hành:</span> {trip.departure_date ? format(new Date(trip.departure_date), "dd/MM/yyyy", { locale: vi }) : "N/A"}</p>
                                <p><span className="font-semibold">Giờ xuất phát:</span> {trip.departure_time || "N/A"}</p>
                                <p><span className="font-semibold">Trạng thái:</span> {trip.status === 'draft' ? 'Nháp' : trip.status === 'completed' ? 'Hoàn thành' : 'Đã đóng'}</p>
                            </div>
                        </div>

                        <div className="border-b border-gray-300 pb-2">
                            <h3 className="font-bold text-lg mb-2">🚛 THÔNG TIN XE</h3>
                            <div className="space-y-1 text-sm">
                                <p><span className="font-semibold">Biển số:</span> <span className="text-xl font-bold">{vehicle?.license_plate || "N/A"}</span></p>
                                <p><span className="font-semibold">Loại xe:</span> {vehicle?.vehicle_type || "N/A"}</p>
                                <p><span className="font-semibold">Tải trọng:</span> {vehicle?.capacity ? `${vehicle.capacity} tấn` : "N/A"}</p>
                            </div>
                        </div>

                        <div className="border-b border-gray-300 pb-2">
                            <h3 className="font-bold text-lg mb-2">👤 THÔNG TIN TÀI XẾ</h3>
                            <div className="space-y-1 text-sm">
                                <p><span className="font-semibold">Họ tên:</span> <span className="font-bold">{driver?.full_name || "N/A"}</span></p>
                                <p><span className="font-semibold">SĐT:</span> {driver?.phone || "N/A"}</p>
                                <p><span className="font-semibold">Bằng lái:</span> {driver?.license_class || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        <div className="border-b border-gray-300 pb-2">
                            <h3 className="font-bold text-lg mb-2">🏢 KHÁCH HÀNG</h3>
                            <div className="space-y-1 text-sm">
                                <p><span className="font-semibold">Tên:</span> {customer?.name || "N/A"}</p>
                                <p><span className="font-semibold">SĐT:</span> {customer?.phone || "N/A"}</p>
                                <p><span className="font-semibold">Địa chỉ:</span> {customer?.address || "N/A"}</p>
                            </div>
                        </div>

                        <div className="border-b border-gray-300 pb-2">
                            <h3 className="font-bold text-lg mb-2">🗺️ TUYẾN ĐƯỜNG</h3>
                            <div className="space-y-1 text-sm">
                                <p><span className="font-semibold">Tên tuyến:</span> {route?.route_name || "Chưa định tuyến"}</p>
                                <p><span className="font-semibold">Từ:</span> {route?.origin || "N/A"}</p>
                                <p><span className="font-semibold">Đến:</span> {route?.destination || "N/A"}</p>
                                <p><span className="font-semibold">Khoảng cách:</span> {route?.distance_km ? `${route.distance_km} km` : "N/A"}</p>
                            </div>
                        </div>

                        <div className="border-b border-gray-300 pb-2">
                            <h3 className="font-bold text-lg mb-2">📦 HÀNG HÓA</h3>
                            <div className="space-y-1 text-sm">
                                <p><span className="font-semibold">Mô tả:</span> {trip.cargo_description || "Không có thông tin"}</p>
                                <p><span className="font-semibold">Khối lượng:</span> {trip.cargo_weight ? `${trip.cargo_weight} tấn` : "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial Info */}
                <div className="border-2 border-gray-800 rounded-lg p-4 mb-6">
                    <h3 className="font-bold text-lg mb-3">💰 THÔNG TIN CƯỚC PHÍ</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                            <span className="font-semibold">Cước vận chuyển:</span>
                            <span className="font-bold">{formatCurrency(trip.freight_charge || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Phí cầu đường:</span>
                            <span className="font-bold">{formatCurrency(trip.toll_fee || 0)}</span>
                        </div>
                        <div className="flex justify-between col-span-2 text-lg border-t-2 border-gray-300 pt-2 mt-2">
                            <span className="font-bold">TỔNG CỘNG:</span>
                            <span className="font-bold text-green-700">{formatCurrency(trip.total_revenue || 0)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {trip.notes && (
                    <div className="mb-6">
                        <h3 className="font-bold text-lg mb-2">📝 GHI CHÚ</h3>
                        <p className="text-sm border border-gray-300 rounded p-3 bg-gray-50">{trip.notes}</p>
                    </div>
                )}

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-8 mt-12 pt-6 border-t-2 border-gray-800">
                    <div className="text-center">
                        <p className="font-bold mb-16">TÀI XẾ</p>
                        <p className="text-sm text-gray-600">(Ký, ghi rõ họ tên)</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold mb-16">QUẢN LÝ</p>
                        <p className="text-sm text-gray-600">(Ký, ghi rõ họ tên)</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold mb-16">KHÁCH HÀNG</p>
                        <p className="text-sm text-gray-600">(Ký, ghi rõ họ tên)</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-xs text-gray-500">
                    <p>Ngày in: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: vi })}</p>
                    <p className="mt-1">Phiếu này là bằng chứng giao nhận hàng hóa. Vui lòng kiểm tra kỹ trước khi ký.</p>
                </div>
            </div>
        </div>
    );
}
