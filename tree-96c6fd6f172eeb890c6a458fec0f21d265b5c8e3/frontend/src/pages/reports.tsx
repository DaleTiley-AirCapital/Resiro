import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Shield, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/layout/header";
import { api } from "@/lib/api";

export default function Reports() {
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  
  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
  });

  const handleExportInsurancePack = async () => {
    if (!selectedProperty) return;
    
    try {
      const response = await api.get(`/api/reports/insurance-pack?propertyId=${selectedProperty}`);
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insurance-pack-${selectedProperty}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export insurance pack:', error);
    }
  };

  const reportTypes = [
    {
      id: "insurance-pack",
      title: "Insurance Pack Export",
      description: "Notarized export of all property documents with provenance tracking and SHA-256 verification",
      icon: Shield,
      color: "bg-blue-100 text-blue-600",
      badge: "Premium",
      badgeColor: "bg-blue-100 text-blue-800",
    },
    {
      id: "property-summary",
      title: "Property Summary Report",
      description: "Comprehensive overview of property details, documents, and maintenance status",
      icon: Building2,
      color: "bg-green-100 text-green-600",
      badge: "Standard",
      badgeColor: "bg-green-100 text-green-800",
    },
    {
      id: "document-audit",
      title: "Document Audit Trail",
      description: "Complete audit trail of all document uploads, verifications, and modifications",
      icon: FileText,
      color: "bg-purple-100 text-purple-600",
      badge: "Audit",
      badgeColor: "bg-purple-100 text-purple-800",
    },
    {
      id: "compliance-report",
      title: "Compliance Report",
      description: "Policy compliance status, gaps, and recommendations for regulatory requirements",
      icon: Calendar,
      color: "bg-orange-100 text-orange-600",
      badge: "Compliance",
      badgeColor: "bg-orange-100 text-orange-800",
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Reports" 
        subtitle="Generate comprehensive property and compliance reports"
      />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Export Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Property
                  </label>
                  <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a property to generate reports" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property: any) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name} ({property.dna_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-6">
                  <Button 
                    onClick={handleExportInsurancePack}
                    disabled={!selectedProperty}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Quick Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            
            return (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${report.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <Badge className={report.badgeColor}>
                          {report.badge}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    {report.description}
                  </p>
                  
                  <div className="space-y-3 text-sm text-gray-500 mb-6">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      <span>Includes provenance tracking</span>
                    </div>
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      <span>SHA-256 verification</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Timestamped export</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    variant="outline"
                    disabled={!selectedProperty}
                    onClick={report.id === "insurance-pack" ? handleExportInsurancePack : undefined}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!selectedProperty && (
          <div className="text-center py-12 mt-8">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a property</h3>
            <p className="text-gray-600">Choose a property above to enable report generation</p>
          </div>
        )}
      </main>
    </div>
  );
}
