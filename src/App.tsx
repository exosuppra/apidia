import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./layouts/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import AuthProvider from "./context/AuthProvider";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/auth/Login";
import SetCode from "./pages/auth/SetCode";
import AdminLogin from "./pages/auth/AdminLogin";
import AdminDashboard from "./pages/admin/Dashboard";
import AllFiches from "./pages/admin/AllFiches";
import PlanningEditorial from "./pages/admin/PlanningEditorial";
import Fiches from "./pages/dashboard/Fiches";
import Catalogue from "./pages/Catalogue";
import ApidaeDetails from "./pages/ApidaeDetails";
import CrmSimplifie from "./pages/CrmSimplifie";
import GenerateurAffiches from "./pages/GenerateurAffiches";
import CreationAffiches from "./pages/CreationAffiches";
import BilanSiteWeb from "./pages/BilanSiteWeb";
import AuditVisibiliteIA from "./pages/AuditVisibiliteIA";
import BusinessDashboard from "./pages/BusinessDashboard";
import GoogleCallback from "./pages/GoogleCallback";
import GestionAvis from "./pages/GestionAvis";
import GenerationSiteWeb from "./pages/GenerationSiteWeb";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/catalogue" element={<Catalogue />} />
            <Route path="/apidae-details" element={<ApidaeDetails />} />
            <Route path="/crm-simplifie" element={<CrmSimplifie />} />
            <Route path="/creation-affiches" element={<CreationAffiches />} />
            <Route path="/generateur-affiches" element={<GenerateurAffiches />} />
            <Route path="/bilan-site-web" element={<BilanSiteWeb />} />
            <Route path="/audit-visibilite-ia" element={<AuditVisibiliteIA />} />
            <Route path="/gestion-avis" element={<GestionAvis />} />
            <Route path="/generation-site-web" element={<GenerationSiteWeb />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/set-code" element={<SetCode />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/fiches" element={<AllFiches />} />
            <Route path="/admin/planning" element={<PlanningEditorial />} />
            
            {/* Main business dashboard */}
            <Route path="/avis" element={
              <RequireAuth>
                <BusinessDashboard />
              </RequireAuth>
            } />
            
            {/* Main dashboard (legacy) */}
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Overview />} />
              <Route path="fiches" element={<Fiches />} />
            </Route>
            
            {/* Google OAuth callback */}
            <Route path="/google-callback" element={<GoogleCallback />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

