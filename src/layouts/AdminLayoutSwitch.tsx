import { ReactNode } from "react";
import AdminLayout from "./AdminLayout";
import AdminLayoutRefonte from "./AdminLayoutRefonte";
import { useAdminInterface } from "@/hooks/useAdminInterface";

/**
 * AdminLayoutSwitch
 * Sélectionne l'un ou l'autre layout admin selon la préférence stockée
 * (localStorage, fixée au login). L'utilisateur peut toggler à tout moment
 * depuis la sidebar de la refonte ou via un switch dans l'interface classique.
 */

interface Props {
  children?: ReactNode;
}

export default function AdminLayoutSwitch({ children }: Props) {
  const [pref] = useAdminInterface();
  if (pref === "refonte") return <AdminLayoutRefonte>{children}</AdminLayoutRefonte>;
  return <AdminLayout>{children}</AdminLayout>;
}
