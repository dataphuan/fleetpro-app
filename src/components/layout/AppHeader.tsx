import { Bell, User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAlertsSummary } from "@/hooks/useAlerts";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Badge } from "@/components/ui/badge";
import { Crown, Building } from "lucide-react";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: alertsSummary } = useAlertsSummary();
  const { data: companySettings } = useCompanySettings();

  const handleLogout = () => {
    // Fire and forget logout to avoid hanging if server is unreachable
    signOut();
    navigate("/auth");
  };

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Người dùng";

  // Calculate generic alerts count from backend
  const totalWarnings = alertsSummary?.criticalCount || 0;

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b bg-card">
      {/* Branding */}
      <div className="flex items-center gap-3 w-80">
        <div className="p-1.5 bg-primary/5 rounded-lg">
          <Building className="w-5 h-5 text-primary/70" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-800 truncate max-w-[280px]">
            {companySettings?.company_name || "Hệ thống quản lý"}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
             <Badge variant="outline" className="text-[9px] h-4 px-1 bg-blue-50/50 text-blue-600 border-blue-200 uppercase font-black tracking-tighter">
                {companySettings?.subscription?.plan || 'trial'}
             </Badge>
          </div>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link to="/?tab=alerts">
            <Bell className="w-5 h-5" />
            {totalWarnings > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {totalWarnings > 99 ? '99+' : totalWarnings}
              </span>
            )}
          </Link>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="w-4 h-4" />
                Cài đặt
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive cursor-pointer flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
