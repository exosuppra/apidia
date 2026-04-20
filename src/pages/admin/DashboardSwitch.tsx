import AdminDashboard from "./Dashboard";
import DashboardRefonte from "./DashboardRefonte";
import { useAdminInterface } from "@/hooks/useAdminInterface";

/**
 * DashboardSwitch — affiche le Hub Refonte ou le Dashboard classique
 * selon la préférence de l'utilisateur.
 */
export default function DashboardSwitch() {
  const [pref] = useAdminInterface();
  if (pref === "refonte") return <DashboardRefonte />;
  return <AdminDashboard />;
}
