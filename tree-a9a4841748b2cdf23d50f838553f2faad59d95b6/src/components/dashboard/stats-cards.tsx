import { useQuery } from "@tanstack/react-query";
import { Building2, Shield, Clock, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const statConfigs = [
  {
    key: "totalProperties",
    label: "Total Properties",
    icon: Building2,
    color: "bg-primary/10 text-primary",
    changeColor: "text-secondary",
  },
  {
    key: "activePolicies", 
    label: "Active Policies",
    icon: Shield,
    color: "bg-secondary/10 text-secondary",
    changeColor: "text-secondary",
  },
  {
    key: "pendingReviews",
    label: "Pending Reviews", 
    icon: Clock,
    color: "bg-accent/10 text-accent",
    changeColor: "text-accent",
  },
  {
    key: "storageUsed",
    label: "Storage Used",
    icon: Database,
    color: "bg-primary/10 text-primary", 
    changeColor: "text-secondary",
  },
];

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statConfigs.map((stat, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="mt-4 h-4 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statConfigs.map((config) => {
        const Icon = config.icon;
        const value = stats?.[config.key] || 0;
        
        return (
          <Card key={config.key} className="bg-surface card-shadow hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-textSecondary text-sm font-medium">{config.label}</p>
                  <p className="text-3xl font-bold text-textPrimary">{value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config.color}`}>
                  <Icon className="text-xl w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${config.changeColor}`}>+8.2%</span>
                <span className="text-textSecondary text-sm ml-2">vs last month</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
