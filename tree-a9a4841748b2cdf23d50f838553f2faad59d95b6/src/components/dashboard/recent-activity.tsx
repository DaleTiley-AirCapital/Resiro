import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Upload, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const activityIcons = {
  create: Upload,
  upload: Upload, 
  verify: CheckCircle,
  analyze: CheckCircle,
};

const activityColors = {
  create: "bg-primary/10 text-primary",
  upload: "bg-primary/10 text-primary",
  verify: "bg-secondary/10 text-secondary", 
  analyze: "bg-secondary/10 text-secondary",
};

export default function RecentActivity() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['/api/dashboard/activity'],
  });

  if (isLoading) {
    return (
      <Card className="bg-surface card-shadow">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-xl font-semibold text-textPrimary">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full mt-1"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatActivityDescription = (activity: any) => {
    switch (activity.action) {
      case 'create':
        if (activity.target_type === 'property') {
          return 'New property added to portfolio';
        }
        if (activity.target_type === 'document') {
          return 'Document uploaded to vault';
        }
        break;
      case 'verify':
        return 'Document verification completed';
      case 'analyze':
        return 'Policy analysis completed';
      default:
        return `${activity.action} performed on ${activity.target_type}`;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  return (
    <Card className="bg-surface card-shadow">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="text-xl font-semibold text-textPrimary">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-textSecondary">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.slice(0, 5).map((activity: any) => {
              const IconComponent = activityIcons[activity.action as keyof typeof activityIcons] || Upload;
              const colorClass = activityColors[activity.action as keyof typeof activityColors] || activityColors.create;
              
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-1 ${colorClass}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-textPrimary">
                      {formatActivityDescription(activity)}
                    </p>
                    <p className="text-xs text-textSecondary">
                      {getTimeAgo(activity.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
