import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const propertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"),
  property_type: z.enum(["residential", "commercial", "industrial", "retail"]),
  country: z.string().min(2, "Country is required"),
  municipality: z.string().min(1, "Municipality is required"),
  parcel_id: z.string().min(1, "Parcel ID is required"),
  unit: z.string().optional(),
  deed_number: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface AddPropertyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generateDnaIdPreview(data: Partial<PropertyFormData>): string {
  if (!data.country || !data.municipality || !data.parcel_id) {
    return "PDNA-XX-XXX-XXX-2024-XXXXXX";
  }
  
  const parts = [
    "PDNA",
    data.country.toUpperCase(),
    data.municipality.toUpperCase(),
    data.parcel_id.toUpperCase(),
  ];
  
  if (data.unit?.trim()) {
    parts.push(data.unit.toUpperCase());
  }
  
  parts.push("2024", "XXXXXX"); // Year and hash placeholder
  
  return parts.join("-");
}

export default function AddPropertyModal({ open, onOpenChange }: AddPropertyModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dnaPreview, setDnaPreview] = useState("");

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: "",
      address: "",
      property_type: "residential",
      country: "ZA",
      municipality: "",
      parcel_id: "",
      unit: "",
      deed_number: "",
    },
  });

  const watchedFields = form.watch();

  useEffect(() => {
    setDnaPreview(generateDnaIdPreview(watchedFields));
  }, [watchedFields]);

  const createPropertyMutation = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      const response = await api.post('/api/properties', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Property created",
        description: "Property has been successfully added to your portfolio.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create property",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PropertyFormData) => {
    createPropertyMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter property name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="property_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ZA">South Africa</SelectItem>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="municipality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Municipality</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CPT" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="parcel_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcel ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., A123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 12A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="deed_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deed Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Deed reference" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* DNA ID Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <FormLabel>Generated DNA ID Preview</FormLabel>
              <div className="font-mono text-sm text-textSecondary bg-white p-3 rounded border mt-2">
                {dnaPreview}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90"
                disabled={createPropertyMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                {createPropertyMutation.isPending ? "Creating..." : "Create Property"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
