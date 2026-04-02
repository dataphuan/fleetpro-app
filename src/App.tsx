import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeInjector } from "@/components/layout/ThemeInjector";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "@/pages/Auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { CustomerPortalLayout } from "@/components/layout/CustomerPortalLayout";
import { Suspense, lazy } from "react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PageSkeleton } from "@/components/shared/PageSkeleton";

// Lazy Loaded Pages - with proper error handling
const Dashboard = lazy(() => import("./pages/Dashboard").catch(err => {
  console.error('Failed to load Dashboard:', err);
  return { default: () => <div>Dashboard failed to load</div> };
}));
const CoachingPage = lazy(() => import("./pages/CoachingPage").catch(err => {
  console.error('Failed to load CoachingPage:', err);
  return { default: () => <div>Coaching failed to load</div> };
}));
const Vehicles = lazy(() => import("./pages/Vehicles").catch(err => {
  console.error('Failed to load Vehicles:', err);
  return { default: () => <div>Vehicles failed to load</div> };
}));
const Drivers = lazy(() => import("./pages/Drivers").catch(err => {
  console.error('Failed to load Drivers:', err);
  return { default: () => <div>Drivers failed to load</div> };
}));
const RoutesPage = lazy(() => import("./pages/Routes").catch(err => {
  console.error('Failed to load Routes:', err);
  return { default: () => <div>Routes failed to load</div> };
}));
const Customers = lazy(() => import("./pages/Customers").catch(err => {
  console.error('Failed to load Customers:', err);
  return { default: () => <div>Customers failed to load</div> };
}));
const Trips = lazy(() => import("./pages/Trips").catch(err => {
  console.error('Failed to load Trips:', err);
  return { default: () => <div>Trips failed to load</div> };
}));
const Dispatch = lazy(() => import("./pages/Dispatch").catch(err => {
  console.error('Failed to load Dispatch:', err);
  return { default: () => <div>Dispatch failed to load</div> };
}));
const Expenses = lazy(() => import("./pages/Expenses").catch(err => {
  console.error('Failed to load Expenses:', err);
  return { default: () => <div>Expenses failed to load</div> };
}));
const Maintenance = lazy(() => import("./pages/Maintenance").catch(err => {
  console.error('Failed to load Maintenance:', err);
  return { default: () => <div>Maintenance failed to load</div> };
}));
const Reports = lazy(() => import("./pages/Reports").catch(err => {
  console.error('Failed to load Reports:', err);
  return { default: () => <div>Reports failed to load</div> };
}));
const Settings = lazy(() => import("./pages/Settings").catch(err => {
  console.error('Failed to load Settings:', err);
  return { default: () => <div>Settings failed to load</div> };
}));
const Alerts = lazy(() => import("./pages/Alerts").catch(err => {
  console.error('Failed to load Alerts:', err);
  return { default: () => <div>Alerts failed to load</div> };
}));
const TransportOrders = lazy(() => import("./pages/TransportOrders").catch(err => {
  console.error('Failed to load TransportOrders:', err);
  return { default: () => <div>Transport Orders failed to load</div> };
}));
const TiresInventory = lazy(() => import("./pages/inventory/TireInventory").catch(err => {
  console.error('Failed to load TiresInventory:', err);
  return { default: () => <div>Tire Inventory failed to load</div> };
}));
const NotFound = lazy(() => import("./pages/NotFound").catch(err => {
  console.error('Failed to load NotFound:', err);
  return { default: () => <div>Page not found</div> };
}));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage").catch(err => {
  console.error('Failed to load UserProfilePage:', err);
  return { default: () => <div>Profile failed to load</div> };
}));
const Pricing = lazy(() => import("./pages/Pricing").catch(err => {
  console.error('Failed to load Pricing:', err);
  return { default: () => <div>Pricing failed to load</div> };
}));
const Members = lazy(() => import("./pages/Members").catch(err => {
  console.error('Failed to load Members:', err);
  return { default: () => <div>Members failed to load</div> };
}));
const Logs = lazy(() => import("./pages/Logs").catch(err => {
  console.error('Failed to load Logs:', err);
  return { default: () => <div>Logs failed to load</div> };
}));
const TrackingCenter = lazy(() => import("./pages/TrackingCenter").catch(err => {
  console.error('Failed to load TrackingCenter:', err);
  return { default: () => <div>Tracking Center failed to load</div> };
}));

// Driver PWA Routes
const DriverDashboard = lazy(() => import("./pages/driver/DriverDashboard").catch(err => {
  console.error('Failed to load DriverDashboard:', err);
  return { default: () => <div>Driver Dashboard failed to load</div> };
}));
const DriverHistory = lazy(() => import("./pages/driver/DriverHistory").catch(err => {
  console.error('Failed to load DriverHistory:', err);
  return { default: () => <div>Driver History failed to load</div> };
}));

// Customer B2B Portal Routes
const CustomerPortal = lazy(() => import("./pages/portal/CustomerPortal").catch(err => {
  console.error('Failed to load CustomerPortal:', err);
  return { default: () => <div>Customer Portal failed to load</div> };
}));

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
          <ThemeInjector />
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
                  <Route path="/coaching" element={<CoachingPage />} />
                  <Route path="/sales" element={<Navigate to="/" replace />} />
                  <Route path="members" element={<Members />} />
                  <Route path="logs" element={<Logs />} />
                  <Route path="/tracking-center" element={<TrackingCenter />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Driver PWA Routes */}
                <Route
                  path="/driver"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageSkeleton />}>
                        <DriverLayout />
                      </Suspense>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DriverDashboard />} />
                  <Route path="history" element={<DriverHistory />} />
                  <Route path="profile" element={<UserProfilePage />} />
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
