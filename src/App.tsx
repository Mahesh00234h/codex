import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicRoute } from "@/components/auth/ProtectedRoute";

// Loading Component
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import NotFound from "./pages/NotFound";
import InstallPage from "./pages/InstallPage";

// PWA Components
import { InstallPrompt } from "./components/pwa/InstallPrompt";
import { OfflineIndicator } from "./components/pwa/OfflineIndicator";
import AutoTranslator from "./components/i18n/AutoTranslator";
import NativeTutorial from "./components/onboarding/NativeTutorial";
import { DEMO_DATA_MODE } from "./lib/backendMode";

// Lazy loaded Farmer Pages
const FarmerDashboard = lazy(() => import("./pages/farmer/FarmerDashboard"));
const FarmMapPage = lazy(() => import("./pages/farmer/FarmMapPage"));
const WeatherCropsPage = lazy(() => import("./pages/farmer/WeatherCropsPage"));
const DiseasePage = lazy(() => import("./pages/farmer/DiseasePage"));
const ProductsPage = lazy(() => import("./pages/farmer/ProductsPage"));
const FarmerOrdersPage = lazy(() => import("./pages/farmer/OrdersPage"));
const SchemesPage = lazy(() => import("./pages/farmer/SchemesPage"));
const EquipmentRentalPage = lazy(() => import("./pages/farmer/EquipmentRentalPage"));
const TradingPage = lazy(() => import("./pages/farmer/TradingPage"));
const QualityGradingPage = lazy(() => import("./pages/farmer/QualityGradingPage"));
const VetsPage = lazy(() => import("./pages/farmer/VetsPage"));

// Lazy loaded Shared Pages
const OrderTrackingPage = lazy(() => import("./pages/shared/OrderTrackingPage"));
const ProfilePage = lazy(() => import("./pages/shared/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/shared/SettingsPage"));
const InvoicePage = lazy(() => import("./pages/shared/InvoicePage"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    if (!DEMO_DATA_MODE || typeof navigator === "undefined") return;

    navigator.serviceWorker?.getRegistrations?.()
      .then((registrations) => registrations.forEach((registration) => registration.unregister()))
      .catch(() => undefined);

    if (typeof caches !== "undefined") {
      caches.keys()
        .then((keys) => keys.forEach((key) => caches.delete(key)))
        .catch(() => undefined);
    }
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <InstallPrompt />
          {!DEMO_DATA_MODE && <AutoTranslator />}
          <NativeTutorial />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/install" element={<InstallPage />} />
            <Route path="/login" element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Farmer Routes */}
            <Route path="/farmer" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}>
                  <FarmerDashboard />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/farmer/map" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}>
                  <FarmMapPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/farmer/weather" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}>
                  <WeatherCropsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/farmer/disease" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}>
                  <DiseasePage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/farmer/products" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}>
                  <ProductsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/farmer/orders" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}>
                  <FarmerOrdersPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/farmer/schemes" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}>
                  <SchemesPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/farmer/equipment" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}>
                  <EquipmentRentalPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/farmer/trading" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}>
                  <TradingPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/farmer/quality" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}>
                  <QualityGradingPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/farmer/vets" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}>
                  <VetsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/farmer/dashboard" element={<Navigate to="/farmer" replace />} />
            <Route path="/farmer/market" element={<Navigate to="/farmer/trading" replace />} />

            <Route path="/track/:orderId" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}>
                  <OrderTrackingPage />
                </Suspense>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="/farmer/profile" element={<ProtectedRoute allowedRoles={['farmer']}><Suspense fallback={<PageLoader />}><ProfilePage /></Suspense></ProtectedRoute>} />
            <Route path="/farmer/settings" element={<ProtectedRoute allowedRoles={['farmer']}><Suspense fallback={<PageLoader />}><SettingsPage /></Suspense></ProtectedRoute>} />

            <Route path="/invoice/:orderId" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <Suspense fallback={<PageLoader />}><InvoicePage /></Suspense>
              </ProtectedRoute>
            } />

            <Route path="/farmer/*" element={<Navigate to="/farmer" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
