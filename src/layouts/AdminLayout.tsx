import { Outlet } from "react-router-dom";
import FloatingChat from "@/components/FloatingChat";

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <>
      {children}
      <FloatingChat />
    </>
  );
}
