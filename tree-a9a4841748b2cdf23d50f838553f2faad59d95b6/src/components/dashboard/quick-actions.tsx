import { Upload, UserPlus, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function QuickActions() {
  const [, setLocation] = useLocation();

  const actions = [
    {
      icon: Upload,
      title: "Upload Documents",
      description: "Add policy or property docs",
      color: "bg-primary/10 text-primary",
      hoverColor: "hover:border-primary/30 hover:bg-primary/5",
      onClick: () => setLocation("/vault"),
    },
    {
      icon: UserPlus,
      title: "Invite Vendor", 
      description: "Grant document access",
      color: "bg-secondary/10 text-secondary",
      hoverColor: "hover:border-secondary/30 hover:bg-secondary/5",
      onClick: () => setLocation("/vendors"),
    },
    {
      icon: BarChart3,
      title: "Run Analysis",
      description: "Check policy gaps", 
      color: "bg-accent/10 text-accent",
      hoverColor: "hover:border-accent/30 hover:bg-accent/5",
      onClick: () => setLocation("/policies"),
    },
  ];

  return (
    <Card className="bg-surface card-shadow">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="text-xl font-semibold text-textPrimary">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          
          return (
            <Button
              key={index}
              variant="ghost"
              className={`w-full flex items-center space-x-3 p-4 rounded-lg border border-gray-200 transition-all ${action.hoverColor} justify-start h-auto`}
              onClick={action.onClick}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-textPrimary">{action.title}</p>
                <p className="text-sm text-textSecondary">{action.description}</p>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
