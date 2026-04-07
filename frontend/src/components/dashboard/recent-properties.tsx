import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function RecentProperties() {
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['/api/properties'],
  });

  const recentProperties = properties.slice(0, 3);

  if (isLoading) {
    return (
      <Card className="bg-surface card-shadow">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-textPrimary">Recent Properties</CardTitle>
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 animate-pulse">
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-6 w-16 bg-gray-200 rounded"></div>
                  <div className="h-3 w-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface card-shadow">
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-textPrimary">Recent Properties</CardTitle>
          <Button variant="ghost" className="text-primary hover:text-primary/80 text-sm font-medium">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {recentProperties.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-textSecondary">No properties added yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentProperties.map((property: any) => (
              <div 
                key={property.id} 
                className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:border-primary/30 transition-colors cursor-pointer"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white/80" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-textPrimary">{property.name}</h3>
                  <p className="text-sm text-textSecondary font-mono">{property.dna_id}</p>
                  <p className="text-sm text-textSecondary">{property.address}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-secondary/10 text-secondary">
                    Verified
                  </Badge>
                  <p className="text-sm text-textSecondary mt-1">
                    Added {new Date(property.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
