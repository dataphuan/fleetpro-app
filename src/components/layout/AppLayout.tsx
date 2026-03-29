import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { GeminiChat } from "@/components/chat/GeminiChat";
import { PaywallGuard } from "@/components/shared/PaywallGuard";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <PaywallGuard>
      <div className="flex h-screen overflow-hidden bg-background relative">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
        <GeminiChat />
      </div>
    </PaywallGuard>
  );
}
