import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Upload,
  Briefcase,
  Shield,
  Settings,
  Plus,
  Edit,
  Share2,
  Clock,
  CheckCircle,
  Building,
  Phone,
  Mail,
  Globe,
  Hash,
  Calendar,
  FileUp,
  Download
} from "lucide-react";
import { format } from "date-fns";

// Roofing template v1 seed data
const ROOFING_TEMPLATE = {
  id: 'template-roofing-v1',
  name: 'Roofing Service Report v1',
  category: 'Roofing',
  version: '1.0',
  fields: [
    { name: 'job_ref', type: 'text', required: true, label: 'Job Reference' },
    { name: 'inspection_date', type: 'date', required: true, label: 'Inspection Date' },
    { name: 'roof_type', type: 'select', required: true, label: 'Roof Type', options: ['Tile', 'Metal', 'Shingle', 'Flat', 'Other'] },
    { name: 'roof_age', type: 'number', required: false, label: 'Roof Age (years)' },
    { name: 'condition', type: 'select', required: true, label: 'Overall Condition', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'] },
    { name: 'issues_found', type: 'textarea', required: false, label: 'Issues Found' },
    { name: 'work_performed', type: 'textarea', required: true, label: 'Work Performed' },
    { name: 'recommendations', type: 'textarea', required: false, label: 'Recommendations' },
    { name: 'warranty_period', type: 'text', required: false, label: 'Warranty Period' },
    { name: 'next_inspection', type: 'date', required: false, label: 'Recommended Next Inspection' }
  ]
};

export default function SupplierDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobForm, setShowJobForm] = useState(false);

  // Fetch supplier profile
  const { data: profile = null } = useQuery({
    queryKey: ['/api/supplier/profile']
  });

  // Fetch jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ['/api/supplier/jobs']
  });

  // Fetch templates
  const { data: templates = [ROOFING_TEMPLATE] } = useQuery({
    queryKey: ['/api/supplier/templates'],
    initialData: [ROOFING_TEMPLATE]
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/supplier/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/profile'] });
      toast({
        title: "Profile updated",
        description: "Your business profile has been updated successfully."
      });
    }
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/supplier/jobs', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/jobs'] });
      setShowJobForm(false);
      toast({
        title: "Job created",
        description: "New job has been created with auto-generated reference."
      });
    }
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, jobId, type }: { file: File; jobId: string; type: string }) => {
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

      // Create document record with supplier_verified provenance
      return apiRequest('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          job_id: jobId,
          kind: type,
          storage_key: signResponse.storageKey,
          sha256,
          bytes: file.size,
          content_type: file.type,
          source: 'supplier_verified' // Mark as supplier verified
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/jobs'] });
      toast({
        title: "Document uploaded",
        description: "Document has been uploaded with supplier verification."
      });
    }
  });

  // Generate share link
  const generateShareLink = async (jobId: string) => {
    try {
      const response = await apiRequest(`/api/supplier/jobs/${jobId}/share`, {
        method: 'POST',
        body: JSON.stringify({
          password: null // No password for MVP
        })
      });
      
      const shareUrl = `${window.location.origin}/share/${response.token}`;
      await navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: "Share link copied",
        description: "The share link has been copied to your clipboard."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate share link.",
        variant: "destructive"
      });
    }
  };

  // Generate job reference
  const generateJobRef = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `JOB-${timestamp}-${random}`;
  };

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Supplier Console</h1>
        <p className="text-gray-600">Manage your business profile, jobs, and documents</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="profile">
            <Building className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="insurance">
            <Shield className="mr-2 h-4 w-4" />
            Insurance
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="jobs">
            <Briefcase className="mr-2 h-4 w-4" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>
                Your business information and branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateProfileMutation.mutate(Object.fromEntries(formData));
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input 
                      id="company_name" 
                      name="company_name"
                      placeholder="Your Company Ltd" 
                      defaultValue={profile?.company_name}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registration_number">Registration Number</Label>
                    <Input 
                      id="registration_number" 
                      name="registration_number"
                      placeholder="2024/123456/07" 
                      defaultValue={profile?.registration_number}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Business Description</Label>
                  <Textarea 
                    id="description" 
                    name="description"
                    placeholder="Describe your services and specializations..." 
                    rows={4}
                    defaultValue={profile?.description}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Business Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <Input 
                        id="email" 
                        name="email"
                        type="email" 
                        placeholder="info@company.co.za"
                        defaultValue={profile?.email}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Business Phone</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <Input 
                        id="phone" 
                        name="phone"
                        placeholder="+27 11 123 4567"
                        defaultValue={profile?.phone}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <Input 
                      id="website" 
                      name="website"
                      placeholder="https://www.company.co.za"
                      defaultValue={profile?.website}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialties">Specialties (comma-separated)</Label>
                  <Input 
                    id="specialties" 
                    name="specialties"
                    placeholder="Roofing, Waterproofing, Gutters"
                    defaultValue={profile?.specialties?.join(', ')}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Insurance & Certifications</CardTitle>
              <CardDescription>
                Upload your business insurance and certification documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Upload your liability insurance, certifications, and licenses
                  </p>
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Documents
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div className="card border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="h-8 w-8 text-gray-500" />
                        <div>
                          <h4 className="font-semibold">Public Liability Insurance</h4>
                          <p className="text-sm text-gray-600">Valid until: Dec 31, 2024</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500 text-white">Active</Badge>
                    </div>
                  </div>

                  <div className="card border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="h-8 w-8 text-gray-500" />
                        <div>
                          <h4 className="font-semibold">Master Builders Association Certificate</h4>
                          <p className="text-sm text-gray-600">Valid until: Jun 30, 2025</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500 text-white">Active</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filing Templates</CardTitle>
              <CardDescription>
                Standard forms and templates for your services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {templates.map((template: any) => (
                  <div key={template.id} className="card border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{template.name}</h4>
                        <p className="text-sm text-gray-600">
                          {template.category} • Version {template.version}
                        </p>
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            {template.fields.length} fields • 
                            {template.fields.filter((f: any) => f.required).length} required
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="mr-1 h-4 w-4" />
                          Customize
                        </Button>
                        <Button size="sm">
                          Use Template
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Jobs</CardTitle>
                  <CardDescription>
                    Manage your jobs and associated documents
                  </CardDescription>
                </div>
                <Button onClick={() => setShowJobForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Job
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showJobForm && (
                <div className="border rounded-lg p-4 mb-6 bg-gray-50">
                  <h3 className="font-semibold mb-4">Create New Job</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const data = Object.fromEntries(formData);
                    createJobMutation.mutate({
                      ...data,
                      job_ref: generateJobRef() // Auto-generate job reference
                    });
                  }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="property_address">Property Address</Label>
                        <Input 
                          id="property_address" 
                          name="property_address"
                          required
                          placeholder="123 Main Street, Cape Town"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client_name">Client Name</Label>
                        <Input 
                          id="client_name" 
                          name="client_name"
                          required
                          placeholder="John Doe"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Job Description</Label>
                      <Textarea 
                        id="description" 
                        name="description"
                        required
                        placeholder="Describe the work to be performed..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">Create Job</Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setShowJobForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="grid gap-4">
                {jobs.map((job: any) => (
                  <div key={job.id} className="card border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{job.property_address}</h4>
                          <Badge variant="outline">
                            <Hash className="mr-1 h-3 w-3" />
                            {job.job_ref}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{job.client_name}</p>
                        <p className="text-sm text-gray-500 mt-1">{job.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(job.created_at), 'MMM dd, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {job.document_count || 0} documents
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateShareLink(job.id)}
                        >
                          <Share2 className="mr-1 h-4 w-4" />
                          Share
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => document.getElementById(`upload-${job.id}`)?.click()}
                        >
                          <FileUp className="mr-1 h-4 w-4" />
                          Upload
                        </Button>
                        <input
                          id={`upload-${job.id}`}
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              uploadDocumentMutation.mutate({
                                file,
                                jobId: job.id,
                                type: 'inspection'
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {jobs.length === 0 && !showJobForm && (
                  <div className="text-center py-8 text-gray-500">
                    <Briefcase className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No jobs yet. Create your first job to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Manage your account and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Secure Share Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Password Protection</p>
                        <p className="text-sm text-gray-600">
                          Require password for shared documents
                        </p>
                      </div>
                      <input type="checkbox" className="toggle" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">End-to-End Encryption (Coming Soon)</p>
                        <p className="text-sm text-gray-600">
                          Enable E2E encryption for maximum security
                        </p>
                      </div>
                      <Badge variant="outline">Phase 2</Badge>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">API Access</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Generate API keys for integration with your systems
                  </p>
                  <Button variant="outline">
                    Generate API Key
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}