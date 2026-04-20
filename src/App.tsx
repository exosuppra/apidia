import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminLayoutSwitch from "./layouts/AdminLayoutSwitch";
import Overview from "./pages/dashboard/Overview";
import AuthProvider from "./context/AuthProvider";
import { ChatProvider } from "./context/ChatContext";
import { ThemeProvider } from "./context/ThemeContext";
import RequireAuth from "./components/RequireAuth";
import RequireAdminAuth from "./components/RequireAdminAuth";
import RequirePasswordChange from "./components/RequirePasswordChange";
import RequirePermission from "./components/RequirePermission";
import Login from "./pages/auth/Login";
import SetCode from "./pages/auth/SetCode";
import ChangePassword from "./pages/auth/ChangePassword";
import AdminLogin from "./pages/auth/AdminLogin";
import AdminDashboardSwitch from "./pages/admin/DashboardSwitch";
import AllFiches from "./pages/admin/AllFiches";
import PlanningEditorial from "./pages/admin/PlanningEditorial";
import UsersManagement from "./pages/admin/UsersManagement";
import UserRequests from "./pages/admin/UserRequests";
import UserActionLogs from "./pages/admin/UserActionLogs";
import SuiviRH from "./pages/admin/SuiviRH";
import SuiviMissions from "./pages/admin/SuiviMissions";
import StatsWeb from "./pages/admin/StatsWeb";
import StatsEreputation from "./pages/admin/StatsEreputation";
import VerificationAlerts from "./pages/admin/VerificationAlerts";
import ImportFiches from "./pages/admin/ImportFiches";
import FichesVerified from "./pages/admin/FichesVerified";
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
import PublicPlanning from "./pages/PublicPlanning";
import PlanningSantons from "./pages/admin/PlanningSantons";
import Linking from "./pages/admin/Linking";
import ApidiaKnowledge from "./pages/admin/ApidiaKnowledge";
import ApidiaChat from "./pages/ApidiaChat";
import TelegramOTO from "./pages/admin/TelegramOTO";
import WidgetApidia from "./pages/admin/WidgetApidia";
import WidgetEmbed from "./pages/WidgetEmbed";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ChatProvider>
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
            <Route path="/auth/change-password" element={
              <RequireAuth>
                <ChangePassword />
              </RequireAuth>
            } />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <AdminLayoutSwitch>
                    <AdminDashboardSwitch />
                  </AdminLayoutSwitch>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            <Route path="/admin/users" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="users">
                    <AdminLayoutSwitch>
                      <UsersManagement />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            <Route path="/admin/fiches" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="fiches">
                    <AdminLayoutSwitch>
                      <AllFiches />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            <Route path="/admin/planning" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="planning">
                    <AdminLayoutSwitch>
                      <PlanningEditorial />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            <Route path="/admin/requests" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="requests">
                    <AdminLayoutSwitch>
                      <UserRequests />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            <Route path="/admin/logs" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="logs">
                    <AdminLayoutSwitch>
                      <UserActionLogs />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            <Route path="/admin/rh" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="rh">
                    <AdminLayoutSwitch>
                      <SuiviRH />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            <Route path="/admin/missions" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="missions">
                    <AdminLayoutSwitch>
                      <SuiviMissions />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            <Route path="/admin/stats-web" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="stats-web">
                    <AdminLayoutSwitch>
                      <StatsWeb />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            <Route path="/admin/stats-ereputation" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="stats-ereputation">
                    <AdminLayoutSwitch>
                      <StatsEreputation />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            <Route path="/admin/verification-alerts" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="fiches">
                    <AdminLayoutSwitch>
                      <VerificationAlerts />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            <Route path="/admin/import-fiches" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="fiches">
                    <AdminLayoutSwitch>
                      <ImportFiches />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            <Route path="/admin/fiches-verified" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="fiches">
                    <AdminLayoutSwitch>
                      <FichesVerified />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            
            <Route path="/admin/planning-santons" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="planning-santons">
                    <AdminLayoutSwitch>
                      <PlanningSantons />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            
            <Route path="/admin/linking" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="linking">
                    <AdminLayoutSwitch>
                      <Linking />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            
            <Route path="/admin/apidia" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="apidia">
                    <AdminLayoutSwitch>
                      <ApidiaKnowledge />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            
            <Route path="/admin/telegram-oto" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="telegram-oto">
                    <AdminLayoutSwitch>
                      <TelegramOTO />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            
            <Route path="/admin/widget-apidia" element={
              <RequireAdminAuth>
                <RequirePasswordChange>
                  <RequirePermission pageKey="widget-apidia">
                    <AdminLayoutSwitch>
                      <WidgetApidia />
                    </AdminLayoutSwitch>
                  </RequirePermission>
                </RequirePasswordChange>
              </RequireAdminAuth>
            } />
            
            {/* Public widget embed */}
            <Route path="/widget/:token" element={<WidgetEmbed />} />
            
            {/* Main business dashboard */}
            <Route path="/avis" element={
              <RequireAuth>
                <RequirePasswordChange>
                  <BusinessDashboard />
                </RequirePasswordChange>
              </RequireAuth>
            } />
            
            {/* Main dashboard (legacy) */}
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <RequirePasswordChange>
                    <DashboardLayout />
                  </RequirePasswordChange>
                </RequireAuth>
              }
            >
              <Route index element={<Overview />} />
              <Route path="fiches" element={<Fiches />} />
            </Route>
            
            {/* Google OAuth callback */}
            <Route path="/google-callback" element={<GoogleCallback />} />
            
            {/* Public Apidia chat */}
            <Route path="/apidia" element={<ApidiaChat />} />
            
            {/* Public planning view */}
            <Route path="/planning/:token" element={<PublicPlanning />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            </ChatProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
