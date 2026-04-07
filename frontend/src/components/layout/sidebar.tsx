import { Building2, Home, FolderOpen, Shield, Users, Wrench, FileText, User, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/app/dashboard", icon: Home },
  { name: "Properties", href: "/app/properties", icon: Building2 },
  { name: "Document Vault", href: "/app/vault", icon: FolderOpen },
  { name: "Policy Analysis", href: "/app/policies", icon: Shield },
  { name: "Vendors", href: "/app/vendors", icon: Users },
  { name: "Maintenance", href: "/app/maintenance", icon: Wrench },
  { name: "Reports", href: "/app/reports", icon: FileText },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-80 bg-surface shadow-sidebar flex flex-col">
      {/* Organization Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <Building2 className="text-white text-xl w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-textPrimary">Premier Properties</h1>
            <p className="text-sm text-textSecondary">ORG-2024-ABC123</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href === "/app/dashboard" && (location === "/app" || location === "/app/dashboard"));
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-textSecondary hover:bg-gray-100"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="text-gray-600 w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Sarah Thompson</p>
            <p className="text-xs text-textSecondary">Property Manager</p>
          </div>
          <button className="text-textSecondary hover:text-textPrimary">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
