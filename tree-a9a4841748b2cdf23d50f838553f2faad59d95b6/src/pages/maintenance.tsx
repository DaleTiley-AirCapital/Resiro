import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wrench, Plus, Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/layout/header";
import { api } from "@/lib/api";

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const priorityIcons = {
  low: CheckCircle2,
  medium: Clock,
  high: AlertCircle,
  critical: AlertCircle,
};

export default function Maintenance() {
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  
  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
  });

  // Mock maintenance items since we need property-specific data
  const mockMaintenanceItems = [
    {
      id: "1",
      title: "HVAC System Inspection",
      description: "Quarterly inspection and maintenance of heating, ventilation, and air conditioning systems",
      frequency: "quarterly",
      priority: "high",
      next_due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assigned_to: "HVAC Specialists Inc",
      property_name: "Skyline Apartments",
    },
    {
      id: "2",
      title: "Fire Safety Equipment Check",
      description: "Monthly testing of fire alarms, extinguishers, and emergency lighting",
      frequency: "monthly",
      priority: "critical",
      next_due: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      assigned_to: "Fire Safety Pro",
      property_name: "Ocean View Estate",
    },
    {
      id: "3",
      title: "Electrical System Inspection",
      description: "Annual inspection of electrical panels, wiring, and safety systems",
      frequency: "annually",
      priority: "high",
      next_due: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      assigned_to: null,
      property_name: "Gateway Office Park",
    },
    {
      id: "4",
      title: "Plumbing Maintenance",
      description: "Bi-annual inspection of plumbing systems, pipes, and fixtures",
      frequency: "bi-annually",
      priority: "medium",
      next_due: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      assigned_to: "City Plumbers",
      property_name: "Skyline Apartments",
    },
  ];

  const filteredItems = selectedProperty === "all" 
    ? mockMaintenanceItems 
    : mockMaintenanceItems.filter(item => item.property_name === selectedProperty);

  const handleBootstrapMaintenance = async () => {
    if (properties.length > 0) {
      try {
        await api.post('/api/maintenance/bootstrap', {
          propertyId: properties[0].id,
        });
      } catch (error) {
        console.error('Failed to bootstrap maintenance:', error);
      }
    }
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueBadge = (dueDate: Date) => {
    const days = getDaysUntilDue(dueDate);
    
    if (days < 0) {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    } else if (days <= 7) {
      return <Badge className="bg-orange-100 text-orange-800">Due Soon</Badge>;
    } else if (days <= 30) {
      return <Badge className="bg-yellow-100 text-yellow-800">Upcoming</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">Scheduled</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Maintenance" 
        subtitle="Property maintenance schedules and tasks"
        actions={
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleBootstrapMaintenance}>
              <Plus className="w-4 h-4 mr-2" />
              Bootstrap Standards
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        }
      />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              <SelectItem value="Skyline Apartments">Skyline Apartments</SelectItem>
              <SelectItem value="Ocean View Estate">Ocean View Estate</SelectItem>
              <SelectItem value="Gateway Office Park">Gateway Office Park</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No maintenance tasks</h3>
            <p className="text-gray-600 mb-4">Bootstrap standard maintenance items to get started</p>
            <Button onClick={handleBootstrapMaintenance} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Bootstrap Standards
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredItems.map((item) => {
              const PriorityIcon = priorityIcons[item.priority as keyof typeof priorityIcons];
              const priorityColor = priorityColors[item.priority as keyof typeof priorityColors];
              
              return (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Wrench className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                          <p className="text-sm text-gray-600">{item.property_name}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge className={priorityColor}>
                          <PriorityIcon className="w-3 h-3 mr-1" />
                          {item.priority}
                        </Badge>
                        {getDueBadge(item.next_due)}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                      {item.description}
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Frequency:</span>
                        <Badge variant="outline" className="capitalize">
                          {item.frequency}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Next Due:</span>
                        <div className="flex items-center text-gray-900">
                          <Calendar className="w-4 h-4 mr-2" />
                          {item.next_due.toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Assigned To:</span>
                        <span className="text-gray-900">
                          {item.assigned_to || 'Unassigned'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Days Until Due:</span>
                        <span className={`font-medium ${
                          getDaysUntilDue(item.next_due) <= 7 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {getDaysUntilDue(item.next_due)} days
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
