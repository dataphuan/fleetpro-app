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
  MapPin,
  ExternalLink,
  CreditCard,
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
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useSmartAlerts } from "@/hooks/useSmartAlerts";

// Define which roles can access each menu item
const roleAccessMap: Record<string, UserRole[]> = {
  "/": ["admin", "manager", "dispatcher", "accountant", "driver", "viewer"],
  "/vehicles": ["admin", "manager", "dispatcher", "viewer"],
  "/drivers": ["admin", "manager", "dispatcher", "viewer"],
  "/routes": ["admin", "manager", "dispatcher", "viewer"],
  "/customers": ["admin", "manager", "accountant", "viewer"],
  "/trips": ["admin", "manager", "dispatcher", "accountant", "driver", "viewer"],
  "/expenses": ["admin", "manager", "accountant"],
  "/transport-orders": ["admin", "manager", "dispatcher", "accountant"],
  "/dispatch": ["admin", "manager", "dispatcher"],
  "/maintenance": ["admin", "manager", "accountant"],
  "/inventory/tires": ["admin", "manager", "accountant"],
  "/reports": ["admin", "manager", "accountant"],
  "/alerts": ["admin", "manager", "dispatcher"],
  "/settings": ["admin"],
  "/members": ["admin"],
  "/pricing": ["admin"],
  "/logs": ["admin"],
  "/tracking-center": ["admin", "manager", "dispatcher", "accountant", "driver", "viewer"],
  "/coaching": ["admin", "manager"],
  "/profile": ["superadmin", "admin", "manager", "dispatcher", "accountant", "driver", "viewer"],
  "/super-admin": ["superadmin"],
};

// Compact sidebar types
interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
interface NavSection {
  label: string;
  items: NavItem[];
}

// 5 core sections — no PHÁT TRIỂN, no HỆ THỐNG (moved to bottom bar)
const navSections: NavSection[] = [
  {
    label: "TỔNG QUAN",
    items: [
      { path: "/", label: "Bảng Điều Khiển", icon: LayoutDashboard },
      { path: "/reports", label: "Báo Cáo", icon: BarChart3 },
      { path: "/alerts", label: "Cảnh Báo", icon: Bell },
    ],
  },
  {
    label: "DANH MỤC",
    items: [
      { path: "/vehicles", label: "Xe", icon: Truck },
      { path: "/drivers", label: "Tài Xế", icon: Users },
      { path: "/routes", label: "Tuyến Đường", icon: Route },
      { path: "/customers", label: "Khách Hàng", icon: Building2 },
    ],
  },
  {
    label: "VẬN HÀNH",
    items: [
      { path: "/transport-orders", label: "Đơn Hàng", icon: ClipboardList },
      { path: "/dispatch", label: "Điều Phối", icon: Calendar },
      { path: "/tracking-center", label: "Tracking", icon: MapPin },
    ],
  },
  {
    label: "TÀI CHÍNH",
    items: [
      { path: "/trips", label: "Doanh Thu", icon: Package },
      { path: "/expenses", label: "Chi Phí", icon: Wallet },
    ],
  },
  {
    label: "KỸ THUẬT",
    items: [
      { path: "/maintenance", label: "Bảo Trì", icon: Wrench },
      { path: "/inventory/tires", label: "Kho & Lốp", icon: Package },
    ],
  },
  {
    label: "HỆ THỐNG",
    items: [
      { path: "/super-admin", label: "Quản trị Hệ thống", icon: ShieldCheck },
      { path: "/logs", label: "Nhật ký Hệ thống", icon: Lock },
    ],
  },
  {
    label: "CÔNG TY",
    items: [
      { path: "/members", label: "Nhân Sự", icon: Users },
      { path: "/pricing", label: "Gói Cước & Thanh toán", icon: CreditCard },
      { path: "/settings", label: "Cấu Hình", icon: Settings },
    ],
  },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { toast } = useToast();
  const { role } = useAuth();
  const { data: companySettings } = useCompanySettings();
  const guideUrl = "https://tnc.io.vn/docs/huong-dan-phu-an/";
  const videoUrl = import.meta.env.VITE_SUPPORT_VIDEO_URL || "";
  const hasVideoUrl = videoUrl.trim().length > 0;

  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const { data: routes } = useRoutes();
  const { data: customers } = useCustomers();
  const { criticalBadgeCount } = useSmartAlerts();

  const hasAccess = (path: string) => {
    const allowedRoles = roleAccessMap[path] || [];
    return allowedRoles.includes(role);
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen glass-sidebar transition-all duration-300 relative z-40",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Decorative Brand Gradient — Premium Touch */}
      {!collapsed && (
        <div className="absolute top-0 left-0 w-1 h-24 bg-gradient-to-b from-[hsl(var(--brand-primary))] to-transparent opacity-80" />
      )}

      {/* Logo — Compact with Premium Borders */}
      <div className="flex items-center h-14 px-3 border-b border-sidebar-border/30 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[hsl(var(--brand-primary))] text-sidebar-primary-foreground shadow-lg shadow-[hsl(var(--brand-primary))/0.2] overflow-hidden flex-shrink-0 animate-fade-in">
            {companySettings?.logo_url ? (
              <img src={companySettings.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Truck className="w-4 h-4" />
            )}
          </div>
          {!collapsed && (
            <div className="animate-fade-in min-w-0">
              <h1 className="text-[13px] font-bold text-sidebar-foreground leading-tight line-clamp-2">
                {companySettings?.company_name || "FleetPro"}
              </h1>
            </div>
          )}
        </div>
      </div>

      {/* Navigation — Compact Grouped Sections */}
      <nav className="flex-1 overflow-y-auto py-1 px-1.5 scrollbar-thin">
        {navSections.map((section, sectionIdx) => {
          const visibleItems = section.items.filter(item => hasAccess(item.path) || item.path === "/");
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className={cn(sectionIdx > 0 && "mt-1.5 pt-1.5 border-t border-sidebar-border/30")}>
              {!collapsed && (
                <h3 className="px-2.5 mb-0.5 text-[9px] font-bold tracking-widest text-sidebar-foreground/35 uppercase">
                  {section.label}
                </h3>
              )}
              <ul className="space-y-px">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  const isDisabled = !hasAccess(item.path);

                  const isOperationalTab = ["/trips", "/expenses", "/dispatch", "/transport-orders", "/reports"].includes(item.path);
                  const hasMasterData = (vehicles?.length || 0) > 0 &&
                    (drivers?.length || 0) > 0 &&
                    (routes?.length || 0) > 0 &&
                    (customers?.length || 0) > 0;
                  const isMissingDependency = isOperationalTab && !hasMasterData;
                  const isEffectivelyDisabled = isDisabled || isMissingDependency;

                  return (
                    <li key={item.path}>
                      <Link
                        to={isEffectivelyDisabled ? "#" : item.path}
                        onClick={(e) => {
                          if (isDisabled) {
                            e.preventDefault();
                            toast({ title: "Không có quyền", description: "Liên hệ Admin.", variant: "destructive" });
                          } else if (isMissingDependency) {
                            e.preventDefault();
                            toast({ title: "Chưa đủ dữ liệu nền", description: "Vui lòng nhập danh sách Xe, Tài xế, Tuyến đường và Khách hàng", variant: "default" });
                          } else {
                            onNavigate?.();
                          }
                        }}
                        className={cn(
                          "nav-item flex items-center gap-3 py-2.5 px-3",
                          isActive ? "nav-item-active" : "nav-item-inactive",
                          isEffectivelyDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-sidebar-foreground"
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <div className="relative">
                          <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                          {isDisabled && (
                            <div className="absolute -top-1 -right-1">
                              <Lock className="w-2.5 h-2.5 text-destructive" />
                            </div>
                          )}
                          {!isDisabled && isMissingDependency && (
                            <div className="absolute -top-1 -right-1">
                              <Lock className="w-2.5 h-2.5 text-amber-500" />
                            </div>
                          )}
                          {item.path === "/alerts" && criticalBadgeCount > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center font-semibold">
                              {criticalBadgeCount > 99 ? "99+" : criticalBadgeCount}
                            </span>
                          )}
                        </div>
                        {!collapsed && (
                          <span className="animate-fade-in text-[13px]">{item.label}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Bottom System Bar */}
      <div className="border-t border-sidebar-border/50 px-1.5 py-1.5 space-y-0.5">
        {!collapsed ? (
          <div className="flex items-center gap-0.5">
            {hasAccess("/profile") && (
              <Link to="/profile" className={cn("flex-1 flex min-h-10 items-center justify-center gap-1 rounded text-[11px] font-medium transition-colors", location.pathname === '/profile' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30')} title="Hồ Sơ">
                <UserCircle className="w-3.5 h-3.5" />
                <span>Hồ Sơ</span>
              </Link>
            )}
            {hasAccess("/settings") && (
              <Link to="/settings" className={cn("flex-1 flex min-h-10 items-center justify-center gap-1 rounded text-[11px] font-medium transition-colors", location.pathname === '/settings' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30')} title="Cài Đặt">
                <Settings className="w-3.5 h-3.5" />
                <span>Cài Đặt</span>
              </Link>
            )}
            {hasAccess("/members") && (
              <Link to="/members" className={cn("flex-1 flex min-h-10 items-center justify-center gap-1 rounded text-[11px] font-medium transition-colors", location.pathname === '/members' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30')} title="Thành Viên">
                <Users className="w-3.5 h-3.5" />
                <span>Team</span>
              </Link>
            )}
            {hasAccess("/logs") && (
              <Link to="/logs" className={cn("flex-1 flex min-h-10 items-center justify-center gap-1 rounded text-[11px] font-medium transition-colors", location.pathname === '/logs' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30')} title="Nhật Ký">
                <Lock className="w-3.5 h-3.5" />
                <span>Logs</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            {hasAccess("/profile") && <Link to="/profile" className="p-2 min-h-[40px] flex items-center justify-center rounded text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30" title="Hồ Sơ"><UserCircle className="w-5 h-5" /></Link>}
            {hasAccess("/settings") && <Link to="/settings" className="p-2 min-h-[40px] flex items-center justify-center rounded text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30" title="Cài Đặt"><Settings className="w-5 h-5" /></Link>}
          </div>
        )}

        {!collapsed ? (
          <div className="grid grid-cols-2 gap-1 pt-1">
            <a
              href={guideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-10 items-center justify-center gap-1.5 rounded border border-sidebar-border/50 px-2 text-[10px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
              title="Hướng dẫn theo vai trò"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Hướng dẫn</span>
            </a>
            <a
              href={hasVideoUrl ? videoUrl : "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!hasVideoUrl) {
                  e.preventDefault();
                  toast({ title: "Video đang cập nhật", description: "Chưa cấu hình VITE_SUPPORT_VIDEO_URL.", variant: "default" });
                }
              }}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded border border-sidebar-border/50 px-2 text-[10px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
              title="Xem video"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Xem video</span>
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 pt-1">
            <a
              href={guideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 min-h-[40px] flex items-center justify-center rounded text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
              title="Hướng dẫn theo vai trò"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <a
              href={hasVideoUrl ? videoUrl : "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!hasVideoUrl) {
                  e.preventDefault();
                  toast({ title: "Video đang cập nhật", description: "Chưa cấu hình VITE_SUPPORT_VIDEO_URL.", variant: "default" });
                }
              }}
              className="p-2 min-h-[40px] flex items-center justify-center rounded text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
              title="Xem video"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        )}

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full h-12 min-h-[48px] justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <>
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              <span className="text-[11px]">Thu gọn</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
