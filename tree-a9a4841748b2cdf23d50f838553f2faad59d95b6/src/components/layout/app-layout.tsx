import { ReactNode } from "react";
import Sidebar from "./sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-background font-inter text-textPrimary">
      <Sidebar />
      {children}
    </div>
  );
}
