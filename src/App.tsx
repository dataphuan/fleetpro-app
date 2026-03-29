import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Outlet } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "@/pages/Auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { CustomerPortalLayout } from "@/components/layout/CustomerPortalLayout";
import { Suspense, lazy } from "react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PageSkeleton } from "@/components/shared/PageSkeleton";

// Lazy Loaded Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const Drivers = lazy(() => import("./pages/Drivers"));
const RoutesPage = lazy(() => import("./pages/Routes"));
const Customers = lazy(() => import("./pages/Customers"));
const Trips = lazy(() => import("./pages/Trips"));
const Dispatch = lazy(() => import("./pages/Dispatch"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Alerts = lazy(() => import("./pages/Alerts"));
const TransportOrders = lazy(() => import("./pages/TransportOrders"));
const TiresInventory = lazy(() => import("./pages/inventory/TireInventory"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Members = lazy(() => import("./pages/Members"));
const Logs = lazy(() => import("./pages/Logs"));

// Driver PWA Routes
const DriverDashboard = lazy(() => import("./pages/driver/DriverDashboard"));

// Customer B2B Portal Routes
const CustomerPortal = lazy(() => import("./pages/portal/CustomerPortal"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes (reduced Firebase billing costs)
      gcTime: 10 * 60 * 1000,   // 10 minutes cache
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch when user clicks back to app
    },
  },
});

const App = () => {
  // Use HashRouter for Electron (file:// protocol), BrowserRouter for web
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
  const Router = isElectron ? HashRouter : BrowserRouter;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Router>
            <ErrorBoundary>
              <Routes>
                <Route path="/auth" element={<Auth />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Suspense fallback={<PageSkeleton />}>
                          <Outlet />
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/vehicles" element={<Vehicles />} />
                  <Route path="/drivers" element={<Drivers />} />
                  <Route path="/routes" element={<RoutesPage />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/trips" element={<Trips />} />
                  <Route path="/dispatch" element={<Dispatch />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/transport-orders" element={<TransportOrders />} />
                  <Route path="/maintenance" element={<Maintenance />} />
                  <Route path="/inventory/tires" element={<TiresInventory />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<UserProfilePage />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="members" element={<Members />} />
                  <Route path="logs" element={<Logs />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Driver PWA Routes */}
                <Route
                  path="/driver"
                  element={
                    <ProtectedRoute>
                      <DriverLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DriverDashboard />} />
                  {/* <Route path="history" element={<DriverHistory />} /> */}
                  {/* <Route path="profile" element={<UserProfilePage />} /> */}
                </Route>

                {/* Customer B2B Portal Routes */}
                <Route
                  path="/portal"
                  element={
                    <ProtectedRoute>
                      <CustomerPortalLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<CustomerPortal />} />
                </Route>
              </Routes>
            </ErrorBoundary>
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
