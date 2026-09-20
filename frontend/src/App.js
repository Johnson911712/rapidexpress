import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import LandingPage from "@/pages/public/LandingPage";
import TrackPage from "@/pages/public/TrackPage";
import QuotePage from "@/pages/public/QuotePage";
import LoginPage from "@/pages/public/LoginPage";
import RegisterPage from "@/pages/public/RegisterPage";

import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminShipments from "@/pages/admin/AdminShipments";
import AdminShipmentDetail from "@/pages/admin/AdminShipmentDetail";
import AdminQuotes from "@/pages/admin/AdminQuotes";
import AdminCouriers from "@/pages/admin/AdminCouriers";
import AdminCustomers from "@/pages/admin/AdminCustomers";
import AdminVehicles from "@/pages/admin/AdminVehicles";
import AdminSupport from "@/pages/admin/AdminSupport";
import AdminAudit from "@/pages/admin/AdminAudit";

import CourierLayout from "@/pages/courier/CourierLayout";
import CourierJobs from "@/pages/courier/CourierJobs";
import CourierJobDetail from "@/pages/courier/CourierJobDetail";

import PortalLayout from "@/pages/portal/PortalLayout";
import PortalShipments from "@/pages/portal/PortalShipments";
import PortalShipmentDetail from "@/pages/portal/PortalShipmentDetail";
import PortalProfile from "@/pages/portal/PortalProfile";
import PortalSupport from "@/pages/portal/PortalSupport";

function App() {
  return (
    <div className="App">
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/track" element={<TrackPage />} />
            <Route path="/track/:tn" element={<TrackPage />} />
            <Route path="/quote" element={<QuotePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/admin" element={<ProtectedRoute roles={["admin", "super_admin"]}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="shipments" element={<AdminShipments />} />
              <Route path="shipments/:id" element={<AdminShipmentDetail />} />
              <Route path="quotes" element={<AdminQuotes />} />
              <Route path="couriers" element={<AdminCouriers />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="vehicles" element={<AdminVehicles />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="audit" element={<AdminAudit />} />
            </Route>

            <Route path="/courier" element={<ProtectedRoute roles={["courier"]}><CourierLayout /></ProtectedRoute>}>
              <Route index element={<CourierJobs />} />
              <Route path="jobs/:id" element={<CourierJobDetail />} />
            </Route>

            <Route path="/portal" element={<ProtectedRoute roles={["customer"]}><PortalLayout /></ProtectedRoute>}>
              <Route index element={<PortalShipments />} />
              <Route path="shipments/:id" element={<PortalShipmentDetail />} />
              <Route path="profile" element={<PortalProfile />} />
              <Route path="support" element={<PortalSupport />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
