import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/header";
import { ArrowLeft, Home, FileText, Upload, CheckCircle, AlertTriangle, Clock, MapPin, Building2, Trash2 } from "lucide-react";
import { Link } from "wouter";

interface Property {
  id: string;
  dnaCode: string;
  address: string;
  erfNumber?: string;
  township?: string;
  municipality?: string;
  isDemo: boolean;
  documentsCount?: number;
  lastActivity?: string;
  complianceStatus?: 'good' | 'warning' | 'critical';
  description?: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  size: string;
}

export default function PropertyDashboard() {
  const params = useParams();
  const propertyId = params.id;

  // Fetch property details
  const { data: property, isLoading: propertyLoading } = useQuery<Property>({
    queryKey: ["/api/properties", propertyId],
    enabled: !!propertyId,
  });

  // Fetch property documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/properties", propertyId, "documents"],
    enabled: !!propertyId,
  });

  // Demo data for when property is not loaded
  const demoProperty: Property = {
    id: 'demo',
    dnaCode: 'DNA-DEMO-CT',
    address: '123 Example Street, Gardens, Cape Town',
    erfNumber: 'ERF123',
    township: 'Gardens',
    municipality: 'City of Cape Town',
    isDemo: true,
    documentsCount: 5,
    lastActivity: '2 hours ago',
    complianceStatus: 'good',
    description: 'Demonstration property showing platform capabilities'
  };

  const currentProperty = property || demoProperty;

  const demoDocuments: Document[] = [
    { id: '1', name: 'Title Deed.pdf', type: 'Title Deed', uploadedAt: '2024-01-15', size: '2.3 MB' },
    { id: '2', name: 'Electrical_COC.pdf', type: 'Certificate of Compliance', uploadedAt: '2024-01-10', size: '1.1 MB' },
    { id: '3', name: 'Building_Plans.pdf', type: 'Building Plans', uploadedAt: '2024-01-08', size: '5.7 MB' },
    { id: '4', name: 'Insurance_Policy.pdf', type: 'Insurance Policy', uploadedAt: '2024-01-05', size: '0.8 MB' },
    { id: '5', name: 'Property_Valuation.pdf', type: 'Valuation', uploadedAt: '2024-01-01', size: '1.5 MB' },
  ];

  const currentDocuments = documents.length > 0 ? documents : (currentProperty.isDemo ? demoDocuments : []);

  if (propertyLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title={currentProperty.dnaCode}
        subtitle={currentProperty.address}
      />
      
      <main className="flex-1 p-8 overflow-auto">
        {/* Back Button */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Button>
        </Link>

        {/* Property Overview */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Home className="w-5 h-5 text-primary" />
                    <span>{currentProperty.dnaCode}</span>
                    {currentProperty.isDemo && (
                      <Badge variant="outline">DEMO</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{currentProperty.address}</span>
                    </div>
                  </CardDescription>
                </div>
                {currentProperty.isDemo && (
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Demo
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">ERF Number:</span>
                  <p className="font-medium">{currentProperty.erfNumber || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Township:</span>
                  <p className="font-medium">{currentProperty.township || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Municipality:</span>
                  <p className="font-medium">{currentProperty.municipality || 'Not specified'}</p>
                </div>
              </div>
              
              {currentProperty.description && (
                <div>
                  <span className="text-gray-500 text-sm">Description:</span>
                  <p className="text-sm mt-1">{currentProperty.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Property Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Compliance Status</span>
                <div className="flex items-center space-x-2">
                  {currentProperty.complianceStatus === 'good' && (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm text-green-700">Good</span>
                    </>
                  )}
                  {currentProperty.complianceStatus === 'warning' && (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <span className="text-sm text-yellow-700">Warning</span>
                    </>
                  )}
                  {currentProperty.complianceStatus === 'critical' && (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span className="text-sm text-red-700">Critical</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Documents</span>
                <span className="text-sm font-medium">{currentDocuments.length} files</span>
              </div>
              
              {currentProperty.lastActivity && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Activity</span>
                  <span className="text-sm">{currentProperty.lastActivity}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Button className="h-24 flex flex-col space-y-2">
            <Upload className="w-6 h-6" />
            <span className="text-sm">Upload Documents</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col space-y-2">
            <CheckCircle className="w-6 h-6" />
            <span className="text-sm">AI Compliance Check</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col space-y-2">
            <AlertTriangle className="w-6 h-6" />
            <span className="text-sm">Missing Documents</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col space-y-2">
            <Building2 className="w-6 h-6" />
            <span className="text-sm">Find Contractors</span>
          </Button>
        </div>

        {/* Documents Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Property Documents</CardTitle>
                <CardDescription>
                  All documents related to this property are stored securely with SHA-256 verification
                </CardDescription>
              </div>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {currentDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                <p className="text-gray-600 mb-4">Start building your property's digital history by uploading documents.</p>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload First Document
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {currentDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-gray-600">{doc.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{doc.size}</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{doc.uploadedAt}</span>
                      </div>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}