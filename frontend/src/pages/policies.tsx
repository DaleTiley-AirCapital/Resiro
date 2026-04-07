import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, AlertTriangle, CheckCircle, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import Header from "@/components/layout/header";

const mockFindings = [
  {
    id: "1",
    finding_type: "evidence",
    title: "Property Coverage Confirmed",
    description: "Building coverage of R2.5M confirmed for residential property",
    severity: "low",
    confidence: 0.95,
  },
  {
    id: "2", 
    finding_type: "exclusion",
    title: "Flood Damage Exclusion",
    description: "Policy excludes coverage for flood damage - consider additional flood insurance",
    severity: "high",
    confidence: 0.89,
  },
  {
    id: "3",
    finding_type: "maintenance",
    title: "Annual Electrical Inspection Required",
    description: "Policy requires annual electrical system inspections to maintain coverage",
    severity: "medium",
    confidence: 0.92,
  },
  {
    id: "4",
    finding_type: "endorsement",
    title: "Security System Discount",
    description: "5% premium discount applied for monitored security system",
    severity: "low",
    confidence: 0.88,
  },
];

const severityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800", 
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const typeIcons = {
  evidence: CheckCircle,
  exclusion: AlertTriangle,
  maintenance: FileText,
  endorsement: Shield,
};

export default function Policies() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredFindings = mockFindings.filter(finding => 
    finding.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    finding.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const findingsByType = {
    evidence: filteredFindings.filter(f => f.finding_type === "evidence"),
    exclusion: filteredFindings.filter(f => f.finding_type === "exclusion"),
    maintenance: filteredFindings.filter(f => f.finding_type === "maintenance"),
    endorsement: filteredFindings.filter(f => f.finding_type === "endorsement"),
  };

  const renderFindings = (findings: typeof mockFindings) => (
    <div className="space-y-4">
      {findings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No findings match your search criteria
        </div>
      ) : (
        findings.map((finding) => {
          const Icon = typeIcons[finding.finding_type as keyof typeof typeIcons];
          const severityColor = severityColors[finding.severity as keyof typeof severityColors];
          
          return (
            <Card key={finding.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{finding.title}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge className={severityColor}>
                          {finding.severity}
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(finding.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {finding.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Policy Analysis" 
        subtitle="AI-powered policy gap analysis and recommendations"
        actions={
          <Button className="bg-primary hover:bg-primary/90">
            <Shield className="w-4 h-4 mr-2" />
            Analyze Policies
          </Button>
        }
      />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search findings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              All ({filteredFindings.length})
            </TabsTrigger>
            <TabsTrigger value="evidence">
              Evidence ({findingsByType.evidence.length})
            </TabsTrigger>
            <TabsTrigger value="exclusion">
              Exclusions ({findingsByType.exclusion.length})
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              Maintenance ({findingsByType.maintenance.length})
            </TabsTrigger>
            <TabsTrigger value="endorsement">
              Endorsements ({findingsByType.endorsement.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {renderFindings(filteredFindings)}
          </TabsContent>

          <TabsContent value="evidence">
            {renderFindings(findingsByType.evidence)}
          </TabsContent>

          <TabsContent value="exclusion">
            {renderFindings(findingsByType.exclusion)}
          </TabsContent>

          <TabsContent value="maintenance">
            {renderFindings(findingsByType.maintenance)}
          </TabsContent>

          <TabsContent value="endorsement">
            {renderFindings(findingsByType.endorsement)}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
