import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Shield, 
  Calendar, 
  Users, 
  AlertCircle,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  Share2,
  Download,
  Eye,
  Plus,
  Wrench,
  ArrowLeft
} from "lucide-react";
import { format, addDays, isPast } from "date-fns";

// Demo property data seeded with demo_docs
const DEMO_PROPERTY = {
  id: 'demo',
  dna_id: 'DNA-DEMO-CT',
  name: 'Demo Property',
  address: '123 Example Street, Gardens, Cape Town',
  property_type: 'residential',
  country: 'ZA',
  municipality: 'Cape Town',
  parcel_id: 'ERF-123456',
  unit: null,
  deed_number: 'T123456/2024',
  metadata: {
    demo: true,
    created_for_demo: true
  }
};

const DEMO_DOCUMENTS = [
  {
    id: 'demo-1',
    kind: 'deed',
    name: 'Sample_Title_Deed.pdf',
    storage_key: 'demo/Sample_Title_Deed.pdf',
    sha256: 'abc123def456...',
    bytes: 1024000,
    content_type: 'application/pdf',
    source: 'owner_upload',
    created_at: '2024-01-15T10:00:00Z',
    expires_at: null,
    verified: true
  },
  {
    id: 'demo-2',
    kind: 'certificate',
    name: 'Sample_Electrical_CoC.pdf',
    storage_key: 'demo/Sample_Electrical_CoC.pdf',
    sha256: 'def789ghi012...',
    bytes: 512000,
    content_type: 'application/pdf',
    source: 'supplier_verified',
    created_at: '2024-02-01T14:30:00Z',
    expires_at: '2025-02-01T00:00:00Z',
    verified: true
  },
  {
    id: 'demo-3',
    kind: 'certificate',
    name: 'Sample_PIRB_CoC.pdf',
    storage_key: 'demo/Sample_PIRB_CoC.pdf',
    sha256: 'ghi345jkl678...',
    bytes: 768000,
    content_type: 'application/pdf',
    source: 'supplier_verified',
    created_at: '2024-02-15T09:00:00Z',
    expires_at: '2025-02-15T00:00:00Z',
    verified: true
  },
  {
    id: 'demo-4',
    kind: 'certificate',
    name: 'Sample_SAQCC_Gas_CoC.pdf',
    storage_key: 'demo/Sample_SAQCC_Gas_CoC.pdf',
    sha256: 'jkl901mno234...',
    bytes: 640000,
    content_type: 'application/pdf',
    source: 'supplier_verified',
    created_at: '2024-03-01T11:00:00Z',
    expires_at: '2025-03-01T00:00:00Z',
    verified: false
  },
  {
    id: 'demo-5',
    kind: 'policy',
    name: 'Homeowners_Policy_Sample.pdf',
    storage_key: 'demo/Homeowners_Policy_Sample.pdf',
    sha256: 'mno567pqr890...',
    bytes: 2048000,
    content_type: 'application/pdf',
    source: 'owner_upload',
    created_at: '2024-01-10T08:00:00Z',
    expires_at: '2025-01-10T00:00:00Z',
    verified: false
  },
  {
    id: 'demo-6',
    kind: 'inspection',
    name: 'Roof_Inspection_Report.pdf',
    storage_key: 'demo/Roof_Inspection_Report.pdf',
    sha256: 'pqr123stu456...',
    bytes: 1536000,
    content_type: 'application/pdf',
    source: 'supplier_verified',
    created_at: '2024-04-01T13:00:00Z',
    expires_at: null,
    verified: true
  },
  {
    id: 'demo-7',
    kind: 'contract',
    name: 'Geyser_Warranty.pdf',
    storage_key: 'demo/Geyser_Warranty.pdf',
    sha256: 'stu789vwx012...',
    bytes: 384000,
    content_type: 'application/pdf',
    source: 'supplier_verified',
    created_at: '2024-01-20T10:00:00Z',
    expires_at: '2027-01-20T00:00:00Z',
    verified: true
  },
  {
    id: 'demo-8',
    kind: 'other',
    name: 'Approved_Building_Plans.pdf',
    storage_key: 'demo/Approved_Building_Plans.pdf',
    sha256: 'vwx345yz678...',
    bytes: 4096000,
    content_type: 'application/pdf',
    source: 'owner_upload',
    created_at: '2023-06-01T12:00:00Z',
    expires_at: null,
    verified: false
  },
  {
    id: 'demo-9',
    kind: 'other',
    name: 'Electrician_Invoice.pdf',
    storage_key: 'demo/Electrician_Invoice.pdf',
    sha256: 'yz901abc234...',
    bytes: 256000,
    content_type: 'application/pdf',
    source: 'supplier_verified',
    created_at: '2024-02-01T15:00:00Z',
    expires_at: null,
    verified: true
  },
  {
    id: 'demo-10',
    kind: 'other',
    name: 'Plumber_Invoice.pdf',
    storage_key: 'demo/Plumber_Invoice.pdf',
    sha256: 'abc567def890...',
    bytes: 192000,
    content_type: 'application/pdf',
    source: 'supplier_verified',
    created_at: '2024-02-15T16:00:00Z',
    expires_at: null,
    verified: true
  },
  {
    id: 'demo-11',
    kind: 'certificate',
    name: 'Occupancy_Certificate.pdf',
    storage_key: 'demo/Occupancy_Certificate.pdf',
    sha256: 'def123ghi456...',
    bytes: 896000,
    content_type: 'application/pdf',
    source: 'developer_pack',
    created_at: '2023-07-01T10:00:00Z',
    expires_at: null,
    verified: true
  }
];

const DEMO_POLICY_CHECK = {
  status: 'gaps_detected',
  lastChecked: new Date().toISOString(),
  findings: [
    {
      type: 'compliant',
      title: 'Building Structure Coverage',
      description: 'Policy covers full replacement value of R2,500,000',
      severity: 'low'
    },
    {
      type: 'gap',
      title: 'Electrical Compliance Certificate Expired',
      description: 'Electrical CoC expires in 30 days. Insurance requires valid certificate.',
      severity: 'high'
    },
    {
      type: 'unknown',
      title: 'Roof Maintenance Clause',
      description: 'Policy requires annual roof inspections. Last inspection status unknown.',
      severity: 'medium'
    },
    {
      type: 'compliant',
      title: 'Security Requirements Met',
      description: 'Armed response and alarm system requirements satisfied',
      severity: 'low'
    }
  ]
};

const DEMO_REMINDERS = [
  {
    id: 'rem-1',
    title: 'Electrical CoC Renewal',
    message: 'Electrical compliance certificate expires in 30 days',
    due_date: addDays(new Date(), 30).toISOString(),
    priority: 'high',
    type: 'certificate'
  },
  {
    id: 'rem-2',
    title: 'Insurance Premium Due',
    message: 'Monthly insurance premium payment',
    due_date: addDays(new Date(), 5).toISOString(),
    priority: 'critical',
    type: 'payment'
  },
  {
    id: 'rem-3',
    title: 'Gutter Cleaning',
    message: 'Quarterly gutter maintenance recommended',
    due_date: addDays(new Date(), 15).toISOString(),
    priority: 'medium',
    type: 'maintenance'
  },
  {
    id: 'rem-4',
    title: 'Pool Pump Service',
    message: 'Annual pool pump service due',
    due_date: addDays(new Date(), 60).toISOString(),
    priority: 'low',
    type: 'maintenance'
  }
];

const DEMO_VENDORS = [
  {
    id: 'vendor-1',
    name: 'John Smith',
    company: 'Smith Electrical Services',
    email: 'john@smithelectrical.co.za',
    phone: '+27 82 123 4567',
    specialties: ['Electrical', 'Solar'],
    verified: true
  },
  {
    id: 'vendor-2',
    name: 'Sarah Johnson',
    company: 'ProPlumb Solutions',
    email: 'sarah@proplumb.co.za',
    phone: '+27 83 234 5678',
    specialties: ['Plumbing', 'Gas'],
    verified: true
  },
  {
    id: 'vendor-3',
    name: 'Mike Wilson',
    company: 'Wilson Roofing',
    email: 'mike@wilsonroofing.co.za',
    phone: '+27 84 345 6789',
    specialties: ['Roofing', 'Waterproofing'],
    verified: false
  }
];

export default function PropertyDashboardEnhanced() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("vault");
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // For demo property, use local data
  const isDemo = id === 'demo';

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: [`/api/properties/${id}`],
    enabled: !isDemo
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: [`/api/properties/${id}/documents`],
    enabled: !isDemo
  });

  const { data: policyCheck = null } = useQuery({
    queryKey: [`/api/properties/${id}/policy-check`],
    enabled: !isDemo
  });

  const { data: reminders = [] } = useQuery({
    queryKey: [`/api/properties/${id}/reminders`],
    enabled: !isDemo
  });

  const { data: vendors = [] } = useQuery({
    queryKey: [`/api/properties/${id}/vendors`],
    enabled: !isDemo
  });

  // Use demo data if this is the demo property
  const displayProperty = isDemo ? DEMO_PROPERTY : property;
  const displayDocuments = isDemo ? DEMO_DOCUMENTS : documents;
  const displayPolicyCheck = isDemo ? DEMO_POLICY_CHECK : policyCheck;
  const displayReminders = isDemo ? DEMO_REMINDERS : reminders;
  const displayVendors = isDemo ? DEMO_VENDORS : vendors;

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Calculate SHA256
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Get presigned URL
      const signResponse = await apiRequest('/api/documents/sign', {
        method: 'POST',
        body: JSON.stringify({
          contentType: file.type,
          sha256,
          bytes: file.size
        })
      });

      // Upload to storage
      await fetch(signResponse.url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      // Create document record
      return apiRequest('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          property_id: id,
          kind: 'other',
          storage_key: signResponse.storageKey,
          sha256,
          bytes: file.size,
          content_type: file.type,
          source: 'owner_upload'
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${id}/documents`] });
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded successfully."
      });
    }
  });

  const shareDocument = (doc: any) => {
    setSelectedDocument(doc);
    setShareModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-500 text-white">Compliant</Badge>;
      case 'gaps_detected':
        return <Badge className="bg-yellow-500 text-white">Gaps Detected</Badge>;
      case 'unknown':
        return <Badge className="bg-gray-500 text-white">Unknown</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge className="bg-red-500 text-white">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-500 text-white">Low</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  if (!isDemo && propertyLoading) {
    return <div className="p-8">Loading property...</div>;
  }

  if (!displayProperty) {
    return <div className="p-8">Property not found</div>;
  }

  return (
    <div className="container mx-auto p-8">
      {/* Back Button */}
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={() => setLocation('/app')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Property Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">{displayProperty.name}</h1>
            <p className="text-gray-600">{displayProperty.address}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              {displayProperty.dna_id}
            </Badge>
            {isDemo && (
              <Badge className="bg-blue-500 text-white">Demo Property</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="vault">
            <FileText className="mr-2 h-4 w-4" />
            Vault
          </TabsTrigger>
          <TabsTrigger value="policy">
            <Shield className="mr-2 h-4 w-4" />
            Policy Check
          </TabsTrigger>
          <TabsTrigger value="actions">
            <Calendar className="mr-2 h-4 w-4" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="vendors">
            <Users className="mr-2 h-4 w-4" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="escalation">
            <AlertCircle className="mr-2 h-4 w-4" />
            Escalation
          </TabsTrigger>
        </TabsList>

        {/* Vault Tab */}
        <TabsContent value="vault" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Vault</CardTitle>
              <CardDescription>
                All your property documents in one secure location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isDemo}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadMutation.mutate(file);
                  }}
                />
              </div>

              <div className="grid gap-4">
                {displayDocuments.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="card border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="h-8 w-8 text-gray-500" />
                        <div>
                          <h4 className="font-semibold">{doc.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Badge variant="outline">{doc.kind}</Badge>
                            <span>{(doc.bytes / 1024).toFixed(0)} KB</span>
                            <span>•</span>
                            <span>{format(new Date(doc.created_at), 'MMM dd, yyyy')}</span>
                            {doc.verified && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          {doc.expires_at && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs text-gray-500">
                                Expires: {format(new Date(doc.expires_at), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => shareDocument(doc)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Open document in modal or new tab
                            if (isDemo) {
                              // For demo, show a sample PDF viewer
                              window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank');
                            } else {
                              window.open(`/api/documents/${doc.id}/view`, '_blank');
                            }
                          }}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Trigger download
                            if (isDemo) {
                              // For demo, download a sample file
                              const link = document.createElement('a');
                              link.href = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
                              link.download = doc.name;
                              link.click();
                            } else {
                              const link = document.createElement('a');
                              link.href = `/api/documents/${doc.id}/download`;
                              link.download = doc.name;
                              link.click();
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      SHA256: {doc.sha256.substring(0, 16)}...
                      {doc.source === 'supplier_verified' && (
                        <Badge className="ml-2 bg-blue-500 text-white text-xs">
                          Supplier Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policy Check Tab */}
        <TabsContent value="policy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Policy Compliance</CardTitle>
              <CardDescription>
                AI-powered analysis of your insurance requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {displayPolicyCheck && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <Shield className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-semibold">Overall Status</p>
                        {getStatusBadge(displayPolicyCheck.status)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Last checked: {format(new Date(displayPolicyCheck.lastChecked), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {displayPolicyCheck.findings.map((finding: any, index: number) => (
                      <div
                        key={index}
                        className={`card border rounded-lg p-4 ${
                          finding.type === 'compliant' ? 'compliant border-green-200 bg-green-50' :
                          finding.type === 'gap' ? 'gaps border-yellow-200 bg-yellow-50' :
                          'unknown border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {finding.type === 'compliant' ? (
                              <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                            ) : finding.type === 'gap' ? (
                              <XCircle className="h-5 w-5 text-yellow-500 mt-1" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-gray-500 mt-1" />
                            )}
                            <div>
                              <h4 className="font-semibold">{finding.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
                            </div>
                          </div>
                          <Badge 
                            variant={finding.severity === 'high' ? 'destructive' : 'secondary'}
                          >
                            {finding.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Button 
                      className="w-full"
                      onClick={() => {
                        // Run compliance check
                        if (isDemo) {
                          toast({
                            title: "Compliance Check Complete",
                            description: "Analysis complete. Review the findings above."
                          });
                        } else {
                          toast({
                            title: "Compliance Check Started",
                            description: "Analyzing your insurance policy..."
                          });
                        }
                      }}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Run Full Compliance Check
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions/Reminders Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions & Reminders</CardTitle>
              <CardDescription>
                Upcoming tasks and maintenance items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {displayReminders.map((reminder: any) => (
                  <div
                    key={reminder.id}
                    className="card border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Calendar className="h-6 w-6 text-gray-500" />
                        <div>
                          <h4 className="font-semibold">{reminder.title}</h4>
                          <p className="text-sm text-gray-600">{reminder.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              Due: {format(new Date(reminder.due_date), 'MMM dd, yyyy')}
                            </span>
                            {isPast(new Date(reminder.due_date)) && (
                              <Badge variant="destructive">Overdue</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(reminder.priority)}
                        <Button 
                          size="sm"
                          onClick={() => {
                            // Mark reminder as complete
                            toast({
                              title: "Reminder Completed",
                              description: `${reminder.title} has been marked as complete.`
                            });
                            // In demo, we could update the UI to show completion
                            if (isDemo) {
                              const button = event?.currentTarget as HTMLButtonElement;
                              if (button) {
                                button.disabled = true;
                                button.textContent = 'Completed';
                              }
                            }
                          }}
                        >
                          Mark Complete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    // Show add reminder dialog for demo
                    if (isDemo) {
                      const title = prompt('Enter reminder title:');
                      if (title) {
                        const date = prompt('Enter due date (YYYY-MM-DD):');
                        if (date) {
                          toast({
                            title: "Reminder Added",
                            description: `Reminder "${title}" scheduled for ${date}`
                          });
                        }
                      }
                    } else {
                      toast({
                        title: "Add Reminder",
                        description: "Opening reminder creation form..."
                      });
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Custom Reminder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Providers</CardTitle>
              <CardDescription>
                Verified contractors and service providers for this property
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {displayVendors.map((vendor: any) => (
                  <div
                    key={vendor.id}
                    className="card border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Users className="h-6 w-6 text-gray-500" />
                        <div>
                          <h4 className="font-semibold">{vendor.name}</h4>
                          <p className="text-sm text-gray-600">{vendor.company}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {vendor.specialties.map((specialty: string) => (
                              <Badge key={specialty} variant="outline">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.verified && (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Show vendor contact info
                            if (isDemo) {
                              alert(`Contact ${vendor.name}\n\nCompany: ${vendor.company}\nPhone: (021) 555-0${Math.floor(Math.random() * 900) + 100}\nEmail: ${vendor.name.toLowerCase().replace(/\s+/g, '.')}@${vendor.company.toLowerCase().replace(/\s+/g, '')}.co.za\n\nSpecialties: ${vendor.specialties.join(', ')}`);
                            } else {
                              toast({
                                title: "Contact Vendor",
                                description: `Opening contact details for ${vendor.name}...`
                              });
                            }
                          }}
                        >
                          Contact
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    // Show invite provider form
                    if (isDemo) {
                      const name = prompt('Enter service provider name:');
                      if (name) {
                        const email = prompt('Enter their email address:');
                        if (email) {
                          toast({
                            title: "Invitation Sent",
                            description: `Invitation sent to ${name} at ${email}`
                          });
                        }
                      }
                    } else {
                      toast({
                        title: "Invite Provider",
                        description: "Opening service provider invitation form..."
                      });
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Service Provider
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escalation Tab */}
        <TabsContent value="escalation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Escalation Options</CardTitle>
              <CardDescription>
                Get help when you need it most
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="card border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Insurance Claim Assistance</h4>
                      <p className="text-sm text-gray-600">
                        Get help filing and managing insurance claims with AI-powered guidance
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // Start insurance claim workflow
                        if (isDemo) {
                          const claimType = prompt('What type of claim? (e.g., Water damage, Fire, Theft)');
                          if (claimType) {
                            toast({
                              title: "Claim Started",
                              description: `Insurance claim for "${claimType}" has been initiated. We'll guide you through the process.`
                            });
                          }
                        } else {
                          toast({
                            title: "Insurance Claim",
                            description: "Starting insurance claim assistance workflow..."
                          });
                        }
                      }}
                    >
                      Start Claim
                    </Button>
                  </div>
                </div>

                <div className="card border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <Wrench className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Emergency Repairs</h4>
                      <p className="text-sm text-gray-600">
                        Connect with verified emergency service providers available 24/7
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // Find emergency provider
                        if (isDemo) {
                          const issue = prompt('What emergency service do you need? (e.g., Plumber, Electrician, Locksmith)');
                          if (issue) {
                            toast({
                              title: "Providers Found",
                              description: `3 verified ${issue}s available in your area. Contact details sent to your phone.`
                            });
                          }
                        } else {
                          toast({
                            title: "Emergency Services",
                            description: "Searching for available emergency service providers..."
                          });
                        }
                      }}
                    >
                      Find Provider
                    </Button>
                  </div>
                </div>

                <div className="card border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <AlertCircle className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Legal Protection</h4>
                      <p className="text-sm text-gray-600">
                        Protect against expropriation with secure off-site documentation
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // Show legal protection info
                        if (isDemo) {
                          alert('Legal Protection\n\nYour property documents are:\n✓ Securely stored off-site\n✓ Blockchain verified\n✓ Legally admissible\n✓ Protected against expropriation\n\nAll documents maintain full chain of custody and can be retrieved instantly when needed.');
                        } else {
                          toast({
                            title: "Legal Protection",
                            description: "Opening legal protection information..."
                          });
                        }
                      }}
                    >
                      Learn More
                    </Button>
                  </div>
                </div>

                <div className="card border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-full">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Expert Consultation</h4>
                      <p className="text-sm text-gray-600">
                        Schedule a consultation with property management experts
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // Schedule expert consultation
                        if (isDemo) {
                          const topic = prompt('What would you like to discuss? (e.g., Property valuation, Maintenance planning, Insurance optimization)');
                          if (topic) {
                            toast({
                              title: "Consultation Scheduled",
                              description: `Expert consultation on "${topic}" scheduled for tomorrow at 2:00 PM. You'll receive a calendar invite shortly.`
                            });
                          }
                        } else {
                          toast({
                            title: "Expert Consultation",
                            description: "Opening scheduling form for expert consultation..."
                          });
                        }
                      }}
                    >
                      Schedule Call
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Share Modal (stub for now) */}
      {shareModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Share Document</CardTitle>
              <CardDescription>
                Create a secure share link for {selectedDocument.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm">Password protect this share</span>
                  <input type="checkbox" className="ml-auto" />
                </div>
                <Button className="w-full">Generate Share Link</Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShareModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}