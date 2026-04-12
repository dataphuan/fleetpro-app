import { ReactNode, useEffect, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { GeminiChat } from "@/components/chat/GeminiChat";
import { PaywallGuard } from "@/components/shared/PaywallGuard";

import { Link, useLocation, Navigate } from "react-router-dom";
import { GuidedTour } from "@/components/onboarding/GuidedTour";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeUserRole } from "@/lib/rbac";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1280);
  const location = useLocation();
  const { role } = useAuth();

  // If driver accesses the main app layout, force redirect them to their PWA
  if (normalizeUserRole(role) === 'driver') {
      return <Navigate to="/driver" replace />;
  }

  // UI mode follows viewport to keep desktop UX stable on touch-capable laptops.
  const useMobileShell = viewportWidth < 1024;

  useEffect(() => {
    if (typeof window === "undefined") return;

    setViewportWidth(window.innerWidth);

    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!useMobileShell && mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
  }, [useMobileShell, mobileSidebarOpen]);

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  return (
    <PaywallGuard>
      <div className="flex h-screen overflow-hidden bg-background relative">
        <GuidedTour path={location.pathname} />
        
        {/* Desktop sidebar */}
        {!useMobileShell && <AppSidebar />}

        {/* Mobile sidebar drawer */}
        {useMobileShell && mobileSidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-[1px]"
            onClick={closeMobileSidebar}
            aria-label="Đóng menu"
          />
        )}
        <div
          className={`fixed left-0 top-0 z-50 h-screen w-[80vw] max-w-[320px] bg-sidebar shadow-2xl transition-transform duration-300 ${useMobileShell ? "" : "hidden"} ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <AppSidebar onNavigate={closeMobileSidebar} />
        </div>

        <div className="flex min-w-0 flex-col flex-1 overflow-hidden">
          <AppHeader
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            forceShowMenuButton={useMobileShell}
          />
          <main className="flex-1 overflow-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
            {children}
          </main>
        </div>
        <GeminiChat />
      </div>
    </PaywallGuard>
  );
}
