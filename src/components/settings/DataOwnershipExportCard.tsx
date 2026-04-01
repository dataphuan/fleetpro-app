import { useState } from "react";
import * as XLSX from "xlsx";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, FileArchive, Loader2 } from "lucide-react";
import {
  customerAdapter,
  driverAdapter,
  expenseAdapter,
  tripAdapter,
  vehicleAdapter,
} from "@/lib/data-adapter";
import { prepareExcelData } from "@/lib/export";

type ExportEntity = "vehicles" | "drivers" | "trips" | "expenses";

const COLUMN_MAP: Record<ExportEntity, { key: string; header: string }[]> = {
  vehicles: [
    { key: "vehicle_code", header: "Mã xe" },
    { key: "license_plate", header: "Biển số xe" },
    { key: "vehicle_type", header: "Loại xe" },
    { key: "brand", header: "Hãng xe" },
    { key: "capacity_tons", header: "Tải trọng (tấn)" },
    { key: "current_location", header: "Vị trí hiện tại" },
    { key: "status", header: "Trạng thái" },
  ],
  drivers: [
    { key: "driver_code", header: "Mã tài xế" },
    { key: "full_name", header: "Họ tên" },
    { key: "phone", header: "Điện thoại" },
    { key: "license_number", header: "Số GPLX" },
    { key: "license_expiry", header: "Hạn GPLX" },
    { key: "assigned_vehicle_id", header: "Xe phân công" },
    { key: "status", header: "Trạng thái" },
  ],
  trips: [
    { key: "trip_code", header: "Mã chuyến" },
    { key: "departure_date", header: "Ngày đi" },
    { key: "vehicle.license_plate", header: "Biển số xe" },
    { key: "driver.full_name", header: "Tài xế" },
    { key: "customer.customer_name", header: "Khách hàng" },
    { key: "route.route_name", header: "Tuyến đường" },
    { key: "total_revenue", header: "Doanh thu" },
    { key: "status", header: "Trạng thái" },
  ],
  expenses: [
    { key: "expense_code", header: "Mã phiếu" },
    { key: "expense_date", header: "Ngày chi" },
    { key: "vehicle.license_plate", header: "Biển số xe" },
    { key: "trip.trip_code", header: "Mã chuyến" },
    { key: "category.category_name", header: "Loại chi phí" },
    { key: "description", header: "Diễn giải" },
    { key: "amount", header: "Số tiền" },
    { key: "status", header: "Trạng thái" },
  ],
};

function writeXlsxFile(data: any[], columns: { key: string; header: string }[], filename: string, sheetName: string) {
  const normalized = prepareExcelData(data, columns);
  const ws = XLSX.utils.json_to_sheet(normalized);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function DataOwnershipExportCard() {
  const { toast } = useToast();
  const { tenantId, user } = useAuth();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const logExport = async (type: string, count: number) => {
    if (!tenantId) return;
    try {
      await addDoc(collection(db, "system_logs"), {
        tenant_id: tenantId,
        user_id: user?.id || "unknown",
        user_email: user?.email || "unknown",
        action: "EXPORT",
        collection_name: "data_export",
        entity_id: type,
        metadata: { type, record_count: count },
        timestamp: new Date().toISOString(),
      });
    } catch {
      // best effort
    }
  };

  const exportOne = async (entity: ExportEntity) => {
    setLoadingKey(entity);
    try {
      const dataset =
        entity === "vehicles"
          ? await vehicleAdapter.list()
          : entity === "drivers"
            ? await driverAdapter.list()
            : entity === "trips"
              ? await tripAdapter.list()
              : await expenseAdapter.list();

      const fileLabel = entity === "vehicles"
        ? "DanhSach_Xe"
        : entity === "drivers"
          ? "DanhSach_TaiXe"
          : entity === "trips"
            ? "DanhSach_Chuyen"
            : "DanhSach_ChiPhi";

      writeXlsxFile(dataset, COLUMN_MAP[entity], `${fileLabel}_${new Date().toISOString().slice(0, 10)}`, fileLabel);
      await logExport(entity, dataset.length);
      toast({ title: "Xuất dữ liệu thành công", description: `Đã xuất ${dataset.length} bản ghi ${fileLabel}.` });
    } catch (error: any) {
      toast({ title: "Lỗi xuất dữ liệu", description: error?.message || "Không thể xuất dữ liệu.", variant: "destructive" });
    } finally {
      setLoadingKey(null);
    }
  };

  const exportAllZip = async () => {
    setLoadingKey("zip");
    try {
      const [vehicles, drivers, trips, expenses, customers] = await Promise.all([
        vehicleAdapter.list(),
        driverAdapter.list(),
        tripAdapter.list(),
        expenseAdapter.list(),
        customerAdapter.list(),
      ]);

      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const addSheetZip = (name: string, data: any[], columns: { key: string; header: string }[]) => {
        const rows = prepareExcelData(data, columns);
        const ws = XLSX.utils.json_to_sheet(rows);
        const csv = XLSX.utils.sheet_to_csv(ws);
        zip.file(`${name}.csv`, "\uFEFF" + csv);
      };

      addSheetZip("xe", vehicles, COLUMN_MAP.vehicles);
      addSheetZip("tai_xe", drivers, COLUMN_MAP.drivers);
      addSheetZip("chuyen", trips, COLUMN_MAP.trips);
      addSheetZip("chi_phi", expenses, COLUMN_MAP.expenses);
      addSheetZip("khach_hang", customers, [
        { key: "customer_code", header: "Mã khách hàng" },
        { key: "customer_name", header: "Tên khách hàng" },
        { key: "phone", header: "Điện thoại" },
        { key: "address", header: "Địa chỉ" },
      ]);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FleetPro_FullExport_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      await logExport("full_zip", vehicles.length + drivers.length + trips.length + expenses.length + customers.length);
      toast({ title: "Xuất ZIP thành công", description: "Đã tải file ZIP toàn bộ dữ liệu." });
    } catch (error: any) {
      toast({
        title: "Lỗi xuất ZIP",
        description: error?.message || "Không thể tạo file ZIP. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <Card className="border-emerald-200 bg-emerald-50/40">
      <CardHeader>
        <CardTitle>Dữ Liệu & Export Tự Do</CardTitle>
        <CardDescription className="text-emerald-800">
          Dữ liệu của bạn là của bạn. Export bất cứ lúc nào, không hạn chế.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2">
        <Button variant="outline" onClick={() => exportOne("vehicles")} disabled={loadingKey !== null}>
          {loadingKey === "vehicles" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Xuất tất cả xe (Excel)
        </Button>
        <Button variant="outline" onClick={() => exportOne("drivers")} disabled={loadingKey !== null}>
          {loadingKey === "drivers" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Xuất tất cả tài xế (Excel)
        </Button>
        <Button variant="outline" onClick={() => exportOne("trips")} disabled={loadingKey !== null}>
          {loadingKey === "trips" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Xuất tất cả chuyến đi (Excel)
        </Button>
        <Button variant="outline" onClick={() => exportOne("expenses")} disabled={loadingKey !== null}>
          {loadingKey === "expenses" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Xuất tất cả chi phí (Excel)
        </Button>

        <Button className="md:col-span-2" onClick={exportAllZip} disabled={loadingKey !== null}>
          {loadingKey === "zip" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileArchive className="mr-2 h-4 w-4" />}
          Xuất toàn bộ dữ liệu (ZIP)
        </Button>
      </CardContent>
    </Card>
  );
}
