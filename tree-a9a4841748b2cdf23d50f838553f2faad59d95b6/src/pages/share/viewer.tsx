import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  FileText,
  Download,
  Eye,
  Lock,
  CheckCircle,
  Shield,
  Home,
  LogIn,
  UserPlus,
  Calendar,
  Hash,
  Building,
  User,
  FileDown,
  Copy
} from "lucide-react";
import { format } from "date-fns";

export default function ShareViewer() {
  const { token } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  // Fetch shared data
  const { data: shareData, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/share/${token}`],
    enabled: isUnlocked || !password,
    retry: false
  });

  // Fetch user properties if logged in
  const { data: userProperties = [] } = useQuery({
    queryKey: ['/api/properties'],
    enabled: !!user
  });

  // Unlock with password
  const unlockMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/share/${token}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ password })
      });
    },
    onSuccess: () => {
      setIsUnlocked(true);
      refetch();
      toast({
        title: "Access granted",
        description: "You can now view the shared documents."
      });
    },
    onError: () => {
      toast({
        title: "Invalid password",
        description: "The password you entered is incorrect.",
        variant: "destructive"
      });
    }
  });

  // Adopt documents mutation
  const adoptMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest(`/api/share/${token}/adopt`, {
        method: 'POST',
        body: JSON.stringify({ 
          property_id: propertyId,
          create_property: propertyId === 'new'
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Documents adopted",
        description: "The documents have been added to your property vault."
      });
      setShowAdoptModal(false);
    }
  });

  // Download document
  const downloadDocument = async (doc: any) => {
    try {
      const response = await apiRequest(`/api/share/${token}/download/${doc.id}`, {
        method: 'GET'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast({
        title: "Download started",
        description: `Downloading ${doc.name}`
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to download the document.",
        variant: "destructive"
      });
    }
  };

  // Copy share link
  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "The share link has been copied to your clipboard."
    });
  };

  // Handle password-protected shares
  if (error && !isUnlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-6 w-6 text-gray-600" />
              <CardTitle>Password Protected</CardTitle>
            </div>
            <CardDescription>
              This shared content is password protected. Please enter the password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              unlockMutation.mutate();
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                <Lock className="mr-2 h-4 w-4" />
                Unlock Documents
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shared documents...</p>
        </div>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-gray-600">Share not found or expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold">RezDNA</h1>
                <p className="text-sm text-gray-600">Secure Document Share</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyShareLink}>
                <Copy className="mr-1 h-4 w-4" />
                Copy Link
              </Button>
              {user ? (
                <Button size="sm" onClick={() => setShowAdoptModal(true)}>
                  <Home className="mr-1 h-4 w-4" />
                  Adopt to Property
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/login">
                      <LogIn className="mr-1 h-4 w-4" />
                      Login
                    </a>
                  </Button>
                  <Button size="sm" asChild>
                    <a href="/signup">
                      <UserPlus className="mr-1 h-4 w-4" />
                      Sign Up
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Shared Documents</CardTitle>
                <CardDescription>
                  {shareData.job ? (
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Hash className="h-4 w-4" />
                        {shareData.job.job_ref}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {shareData.job.property_address}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {shareData.job.client_name}
                      </span>
                    </div>
                  ) : (
                    `${shareData.documents?.length || 0} documents shared`
                  )}
                </CardDescription>
              </div>
              {shareData.supplier && (
                <div className="text-right">
                  <p className="font-semibold">{shareData.supplier.company_name}</p>
                  <p className="text-sm text-gray-600">Verified Supplier</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {shareData.documents?.map((doc: any) => (
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
                        </div>
                        {doc.source === 'supplier_verified' && (
                          <div className="flex items-center gap-1 mt-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-green-600">Supplier Verified</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadDocument(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    SHA256: {doc.sha256.substring(0, 16)}...
                  </div>
                </div>
              ))}
            </div>

            {/* Call to Action */}
            {!user && (
              <div className="mt-8 p-6 bg-blue-50 rounded-lg text-center">
                <h3 className="font-semibold text-lg mb-2">
                  Want to save these documents to your property?
                </h3>
                <p className="text-gray-600 mb-4">
                  Create a free RezDNA account to adopt these documents into your property vault.
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" asChild>
                    <a href="/login">
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </a>
                  </Button>
                  <Button asChild>
                    <a href="/signup">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Adopt Modal */}
      {showAdoptModal && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Adopt Documents</CardTitle>
              <CardDescription>
                Choose where to save these documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Property</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={selectedProperty || ''}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                  >
                    <option value="">Choose a property...</option>
                    {userProperties.map((property: any) => (
                      <option key={property.id} value={property.id}>
                        {property.name} ({property.dna_id})
                      </option>
                    ))}
                    <option value="new">Create New Property</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={!selectedProperty}
                    onClick={() => {
                      if (selectedProperty) {
                        adoptMutation.mutate(selectedProperty);
                      }
                    }}
                  >
                    Adopt Documents
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowAdoptModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}