import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { ArrowLeft, Upload, FileText, Home } from "lucide-react";

const propertySchema = z.object({
  erfNumber: z.string().min(1, "ERF/Portion/Stand number is required"),
  township: z.string().min(1, "Township/Extension is required"),
  municipality: z.string().min(1, "Municipality is required"),
  address: z.string().min(1, "Property address is required"),
  description: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

export default function PropertyForm() {
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      erfNumber: "",
      township: "",
      municipality: "",
      address: "",
      description: "",
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'titleDeed' | 'proofOfResidence') => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const onSubmit = async (data: PropertyFormData) => {
    setIsSubmitting(true);
    
    try {
      const propertyData = {
        ...data, name: data.address, parcelId: data.erfNumber, country: 'ZA'
      };
      const response = await api.post('/api/properties', propertyData);
      for (const file of uploadedFiles) {
        const body = new FormData();
        body.append('file', file);
        body.append('propertyId', response.data.id);
        const upload = await fetch('/api/files', {
          method: 'POST', body,
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!upload.ok) throw new Error('Property created, but a document upload failed. Open the property to retry.');
      }
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      
      toast({
        title: "Property Added Successfully!",
        description: `Property code ${response.data.dnaId} has been created for your property.`,
      });
      
      // Redirect to the new property's dashboard
      navigate(`/properties/${response.data.id}`);
    } catch (error: any) {
      toast({
        title: "Error Creating Property",
        description: error?.message || "Failed to create property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Add New Property" 
        subtitle="Create a Property DNA file for your property"
      />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Button>

          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-8 border border-green-200">
            <div className="flex items-center space-x-3 mb-3">
              <Home className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold text-gray-900">Create Your Property DNA</h2>
            </div>
            <p className="text-gray-600">
              Give your property a unique, permanent digital identity. This DNA code will travel with your property forever, 
              maintaining all documentation, compliance records, and service history.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
              <CardDescription>
                Enter the basic details of your property. We'll generate a unique DNA code for it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="erfNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ERF/Portion/Stand Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., ERF 1234, Portion 5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="township"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Township/Extension *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Gardens, Sandton Ext 1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="municipality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Municipality *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., City of Cape Town, City of Johannesburg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Property Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main Street, Suburb Name, City, Postal Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the property (e.g., 3-bedroom house, apartment, etc.)"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          This helps identify the property in your portfolio
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Document Upload Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Upload Documents (Optional)</h3>
                    <p className="text-sm text-gray-600">
                      You can upload these documents now or add them later from your property dashboard.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <Label htmlFor="titleDeed" className="cursor-pointer">
                          <span className="text-sm font-medium text-gray-900">Title Deed</span>
                          <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (max 10MB)</p>
                        </Label>
                        <Input
                          id="titleDeed"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, 'titleDeed')}
                          className="hidden"
                        />
                      </div>

                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <Label htmlFor="proofOfResidence" className="cursor-pointer">
                          <span className="text-sm font-medium text-gray-900">Proof of Residence</span>
                          <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (max 10MB)</p>
                        </Label>
                        <Input
                          id="proofOfResidence"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, 'proofOfResidence')}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-700 mb-2">Uploaded files:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {uploadedFiles.map((file, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <Upload className="w-4 h-4" />
                              <span>{file.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/dashboard")}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating Property..." : "Create Property DNA"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}