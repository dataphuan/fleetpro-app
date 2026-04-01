import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { AlertTriangle, Bell, CheckCircle2, ShieldAlert, Truck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSmartAlerts, SmartAlert } from "@/hooks/useSmartAlerts";

const severityLabel: Record<SmartAlert["severity"], string> = {
  expired: "Đã hết hạn",
  critical: "Nguy cấp",
  warning: "Sắp đến",
  info: "Nhắc nhở",
};

const severityClass: Record<SmartAlert["severity"], string> = {
  expired: "bg-red-100 text-red-700 border-red-200",
  critical: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

const daysText = (daysLeft: number) => {
  if (daysLeft < 0) return `Quá hạn ${Math.abs(daysLeft)} ngày`;
  if (daysLeft === 0) return "Hết hạn hôm nay";
  return `Còn ${daysLeft} ngày`;
};

const formatExpiryDate = (isoDate: string) => {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return format(d, "dd/MM/yyyy", { locale: vi });
};

const filterByTab = (alerts: SmartAlert[], tab: string) => {
  if (tab === "all") return alerts;
  if (tab === "critical") return alerts.filter((a) => a.severity === "expired" || a.severity === "critical");
  if (tab === "warning") return alerts.filter((a) => a.severity === "warning");
  if (tab === "info") return alerts.filter((a) => a.severity === "info");
  return alerts;
};

export default function Alerts() {
  const navigate = useNavigate();
  const { isLoading, activeAlerts, resolvedAlerts, markResolved, markActive } = useSmartAlerts();
  const [tab, setTab] = useState("all");

  const visibleActiveAlerts = useMemo(() => filterByTab(activeAlerts, tab), [activeAlerts, tab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cảnh báo thông minh BH/ĐK"
        description="Nhắc hạn bảo hiểm, đăng kiểm theo 30-60-90 ngày để tránh gián đoạn vận hành."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Bộ lọc cảnh báo</CardTitle>
          <CardDescription>
            Cảnh báo được tạo tự động từ dữ liệu thật của xe trong tenant hiện tại.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-5 md:w-auto md:grid-cols-5">
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="critical">Nguy cấp</TabsTrigger>
              <TabsTrigger value="warning">Sắp đến</TabsTrigger>
              <TabsTrigger value="info">Nhắc nhở</TabsTrigger>
              <TabsTrigger value="resolved">Đã xử lý</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {tab !== "resolved" && (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleActiveAlerts.map((alert) => (
            <Card key={alert.id} className="border-l-4 border-l-red-200">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      {alert.plate}
                    </CardTitle>
                    <CardDescription>{alert.type}</CardDescription>
                  </div>
                  <Badge className={severityClass[alert.severity]}>{severityLabel[alert.severity]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-muted-foreground">Ngày hết hạn</p>
                    <p className="font-semibold">{formatExpiryDate(alert.expiryDate)}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-muted-foreground">Trạng thái</p>
                    <p className="font-semibold">{daysText(alert.daysLeft)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      sessionStorage.setItem("highlightVehicleId", alert.vehicleId);
                      navigate("/vehicles");
                    }}
                  >
                    <Bell className="w-4 h-4" /> Xem xe
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => markResolved(alert.id)}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Đánh dấu đã xử lý
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "resolved" && (
        <div className="grid gap-4 md:grid-cols-2">
          {resolvedAlerts.map((alert) => (
            <Card key={alert.id} className="opacity-90">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{alert.plate}</CardTitle>
                    <CardDescription>{alert.type}</CardDescription>
                  </div>
                  <Badge className="bg-green-50 text-green-700 border-green-200">Đã xử lý</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Hết hạn: {formatExpiryDate(alert.expiryDate)}
                </p>
                <Button variant="ghost" size="sm" onClick={() => markActive(alert.id)}>
                  Khôi phục
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && tab !== "resolved" && visibleActiveAlerts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <ShieldAlert className="w-10 h-10 mx-auto text-green-600" />
            <p className="font-semibold">Không có cảnh báo active</p>
            <p className="text-sm text-muted-foreground">Tất cả hạn BH/ĐK hiện đang trong ngưỡng an toàn.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && tab === "resolved" && resolvedAlerts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="font-semibold">Chưa có cảnh báo đã xử lý</p>
            <p className="text-sm text-muted-foreground">Khi xử lý cảnh báo, chúng sẽ xuất hiện tại đây.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
