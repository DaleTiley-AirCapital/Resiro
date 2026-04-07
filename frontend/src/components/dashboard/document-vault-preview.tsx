import { useQuery } from "@tanstack/react-query";
import { FileText, Shield, Award, Calendar, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const documentIcons = {
  policy: Shield,
  certificate: Award, 
  contract: FileText,
  deed: FileText,
  maintenance: FileText,
  inspection: FileText,
  other: FileText,
};

const documentColors = {
  policy: "bg-blue-100 text-blue-600",
  certificate: "bg-green-100 text-green-600",
  contract: "bg-purple-100 text-purple-600", 
  deed: "bg-yellow-100 text-yellow-600",
  maintenance: "bg-orange-100 text-orange-600",
  inspection: "bg-red-100 text-red-600",
  other: "bg-gray-100 text-gray-600",
};

export default function DocumentVaultPreview() {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/documents'],
  });

  const recentDocuments = documents.slice(0, 5);

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  if (isLoading) {
    return (
      <Card className="bg-surface card-shadow">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-textPrimary">Document Vault</CardTitle>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
                <div className="h-3 w-20 bg-gray-200 rounded"></div>
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
          <CardTitle className="text-xl font-semibold text-textPrimary">Document Vault</CardTitle>
          <Button variant="ghost" className="text-primary hover:text-primary/80 text-sm font-medium">
            View All Documents
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {recentDocuments.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-textSecondary">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200">
                  <TableHead className="text-sm font-medium text-textSecondary">Document</TableHead>
                  <TableHead className="text-sm font-medium text-textSecondary">Property</TableHead>
                  <TableHead className="text-sm font-medium text-textSecondary">Type</TableHead>
                  <TableHead className="text-sm font-medium text-textSecondary">Status</TableHead>
                  <TableHead className="text-sm font-medium text-textSecondary">Upload Date</TableHead>
                  <TableHead className="text-sm font-medium text-textSecondary">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDocuments.map((doc: any) => {
                  const Icon = documentIcons[doc.kind as keyof typeof documentIcons];
                  const colorClass = documentColors[doc.kind as keyof typeof documentColors];
                  
                  return (
                    <TableRow key={doc.id} className="border-gray-100 hover:bg-gray-50">
                      <TableCell className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-textPrimary">
                              Document {doc.id.slice(0, 8)}
                            </p>
                            <p className="text-xs text-textSecondary font-mono">
                              SHA256: {doc.sha256.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-textSecondary">
                        {doc.property_id ? `Property ${doc.property_id.slice(0, 8)}` : 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize bg-primary/10 text-primary">
                          {doc.kind}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={doc.verified_by ? "bg-secondary/10 text-secondary" : "bg-accent/10 text-accent"}
                        >
                          {doc.verified_by ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              Verified
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3 h-3 mr-1" />
                              Pending
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-textSecondary">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-textSecondary">
                        {formatFileSize(doc.bytes)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
