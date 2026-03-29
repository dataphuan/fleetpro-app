import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Building2,
  Package,
  ClipboardList,
  Calendar,
  Wallet,
  Wrench,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Lock,
  Bell,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { useRoutes } from "@/hooks/useRoutes";
import { useCustomers } from "@/hooks/useCustomers";
import { useToast } from "@/hooks/use-toast";
import { useAuth, UserRole } from "@/contexts/AuthContext";

// Define which roles can access each menu item
const roleAccessMap: Record<string, UserRole[]> = {
  "/": ["admin", "manager", "dispatcher", "accountant", "driver", "viewer"], // Dashboard for all
  "/vehicles": ["admin", "manager", "dispatcher", "viewer"],
  "/drivers": ["admin", "manager", "dispatcher", "viewer"],
  "/routes": ["admin", "manager", "dispatcher", "viewer"],
  "/customers": ["admin", "manager", "accountant", "viewer"], // Accountant + viewer only
  "/trips": ["admin", "manager", "dispatcher", "accountant", "driver", "viewer"],
  "/expenses": ["admin", "manager", "dispatcher", "accountant"], // Accountant primary
  "/transport-orders": ["admin", "manager", "dispatcher", "accountant"],
  "/dispatch": ["admin", "manager", "dispatcher"],
  "/maintenance": ["admin", "manager", "accountant"], // Accountant needs maintenance costs
  "/inventory/tires": ["admin", "manager", "accountant"],
  "/reports": ["admin", "manager", "accountant", "viewer"],
  "/alerts": ["admin", "manager", "dispatcher"],
  "/settings": ["admin"], // Only admin
  "/profile": ["admin", "manager", "dispatcher", "accountant", "driver", "viewer"], // All users
};

const navItems = [
  { path: "/", label: "Bảng Điều Khiển", icon: LayoutDashboard },
  { path: "/vehicles", label: "Danh Mục Xe", icon: Truck },
  { path: "/drivers", label: "Danh Mục Tài Xế", icon: Users },
  { path: "/routes", label: "Danh Mục Tuyến Đường", icon: Route },
  { path: "/customers", label: "Danh Mục Khách Hàng", icon: Building2 },
  { path: "/trips", label: "Nhập Liệu Doanh Thu", icon: Package },
  { path: "/expenses", label: "Nhập Liệu Chi Phí", icon: Wallet },
  { path: "/transport-orders", label: "Đơn Hàng Vận Chuyển", icon: ClipboardList },
  { path: "/dispatch", label: "Điều Phối Vận Tải", icon: Calendar },
  { path: "/maintenance", label: "Bảo Trì – Sửa Chữa", icon: Wrench },
  { path: "/inventory/tires", label: "Kho Vật Tư & Lốp", icon: Package },
  { path: "/reports", label: "Báo Cáo Tổng Hợp", icon: BarChart3 },
  { path: "/alerts", label: "Cài Đặt Cảnh Báo", icon: Bell },
  { path: "/profile", label: "Hồ Sơ Cá Nhân", icon: UserCircle },
  { path: "/settings", label: "Cài Đặt Hệ Thống", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { toast } = useToast();
  const { role } = useAuth();

  // Check for master data existence
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const { data: routes } = useRoutes();
  const { data: customers } = useCustomers();

  // Check if user has access to a path based on role
  const hasAccess = (path: string) => {
    const allowedRoles = roleAccessMap[path] || [];
    return allowedRoles.includes(role);
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Truck className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-base font-bold text-sidebar-foreground">FleetPro</h1>
              <p className="text-xs text-sidebar-foreground/60">Quản lý vận tải</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            // Role-based access control
            const isDisabled = !hasAccess(item.path);

            // Hide items user doesn't have access to (except dashboard)
            if (!hasAccess(item.path) && item.path !== "/") {
              return null;
            }

            // Master Data Dependency Check
            const isOperationalTab = ["/trips", "/expenses", "/dispatch", "/transport-orders", "/reports", "/dashboard"].includes(item.path);
            const hasMasterData = (vehicles?.length || 0) > 0 &&
              (drivers?.length || 0) > 0 &&
              (routes?.length || 0) > 0 &&
              (customers?.length || 0) > 0;

            // Only enforce sequential entry for specific roles if needed, or globally? 
            // User request implies global logic to guide workflow.
            const isMissingDependency = isOperationalTab && !hasMasterData;

            const isEffectivelyDisabled = isDisabled || isMissingDependency;

            return (
              <li key={item.path}>
                <Link
                  to={isEffectivelyDisabled ? "#" : item.path}
                  onClick={(e) => {
                    if (isDisabled) {
                      e.preventDefault();
                      toast({
                        title: "Không có quyền truy cập",
                        description: "Bạn không có quyền sử dụng tính năng này. Liên hệ Admin để được cấp quyền.",
                        variant: "destructive",
                      });
                    } else if (isMissingDependency) {
                      e.preventDefault();
                      toast({
                        title: "Chưa đủ dữ liệu nền",
                        description: "Vui lòng nhập danh sách Xe, Tài xế, Tuyến đường và Khách hàng trước khi sử dụng tính năng này.",
                        variant: "default",
                      });
                    }
                  }}
                  className={cn(
                    "nav-item",
                    isActive ? "nav-item-active" : "nav-item-inactive",
                    isEffectivelyDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-sidebar-foreground"
                  )}
                  title={isDisabled ? "Không có quyền truy cập" : isMissingDependency ? "Cần nhập dữ liệu danh mục trước" : (collapsed ? item.label : undefined)}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {isDisabled && (
                      <div className="absolute -top-1 -right-1">
                        <Lock className="w-3 h-3 text-destructive" />
                      </div>
                    )}
                    {!isDisabled && isMissingDependency && (
                      <div className="absolute -top-1 -right-1">
                        <Lock className="w-3 h-3 text-amber-500" />
                      </div>
                    )}
                  </div>
                  {!collapsed && (
                    <span className="animate-fade-in truncate">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse button */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span>Thu gọn</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
