import { Bell, User, LogOut, Settings, Menu, Building, Clock } from "lucide-react";
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
import { useMemo } from "react";

interface AppHeaderProps {
  onOpenMobileSidebar?: () => void;
  forceShowMenuButton?: boolean;
}

export function AppHeader({ onOpenMobileSidebar, forceShowMenuButton = false }: AppHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: alertsSummary } = useAlertsSummary();
  const { data: companySettings } = useCompanySettings();

  const handleLogout = () => {
    signOut();
    navigate("/auth");
  };

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Người dùng";
  const totalWarnings = alertsSummary?.criticalCount || 0;

  // Calculate trial days remaining
  const trialDaysRemaining = useMemo(() => {
    if (!companySettings?.subscription?.trial_ends_at) return null;
    const endDate = new Date(companySettings.subscription.trial_ends_at);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [companySettings?.subscription?.trial_ends_at]);

  const isTrialEnding = trialDaysRemaining !== null && trialDaysRemaining <= 3;

  return (
    <header className="sticky top-0 z-20 flex h-14 sm:h-16 items-center justify-between border-b bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3 lg:w-80">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`${forceShowMenuButton ? "" : "lg:hidden"} min-h-10 min-w-10 shrink-0`}
          onClick={onOpenMobileSidebar}
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="rounded-lg bg-primary/5 p-1.5">
          <Building className="h-5 w-5 text-primary/70" />
        </div>

        <div className="flex min-w-0 flex-col">
          <span className="max-w-[140px] truncate text-xs font-bold text-slate-800 sm:max-w-[220px] sm:text-sm lg:max-w-[280px]">
            {companySettings?.company_name || "Hệ thống quản lý"}
          </span>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="h-4 border-blue-200 bg-blue-50/50 px-1 text-[9px] font-black uppercase tracking-tighter text-blue-600"
            >
              {companySettings?.subscription?.plan || "trial"}
            </Badge>
            {companySettings?.subscription?.plan === "trial" && trialDaysRemaining !== null && (
              <Badge
                variant="outline"
                className={`h-4 px-1 text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 ${
                  isTrialEnding
                    ? "border-orange-200 bg-orange-50/50 text-orange-600"
                    : "border-green-200 bg-green-50/50 text-green-600"
                }`}
              >
                <Clock className="h-3 w-3" />
                {trialDaysRemaining} ngày
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link to="/?tab=alerts">
            <Bell className="h-5 w-5" />
            {totalWarnings > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                {totalWarnings > 99 ? "99+" : totalWarnings}
              </span>
            )}
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 sm:px-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-primary flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="hidden max-w-[140px] truncate text-sm font-medium sm:inline">{displayName}</span>
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
              <Link to="/settings" className="flex cursor-pointer items-center gap-2">
                <Settings className="h-4 w-4" />
                Cài đặt
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="flex cursor-pointer items-center gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
