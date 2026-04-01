import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { GeminiChat } from "@/components/chat/GeminiChat";
import { PaywallGuard } from "@/components/shared/PaywallGuard";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  return (
    <PaywallGuard>
      <div className="flex h-screen overflow-hidden bg-background relative">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        {/* Mobile sidebar drawer */}
        {mobileSidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-[1px] lg:hidden"
            onClick={closeMobileSidebar}
            aria-label="Đóng menu"
          />
        )}
        <div
          className={`fixed left-0 top-0 z-40 h-screen transition-transform duration-300 lg:hidden ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <AppSidebar onNavigate={closeMobileSidebar} />
        </div>

        <div className="flex min-w-0 flex-col flex-1 overflow-hidden">
          <AppHeader onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
          <main className="flex-1 overflow-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
            {children}
          </main>
        </div>
        <GeminiChat />
      </div>
    </PaywallGuard>
  );
}
