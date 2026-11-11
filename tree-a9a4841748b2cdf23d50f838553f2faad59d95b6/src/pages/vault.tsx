import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, FileText, Shield, Award, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/layout/header";
import { ObjectUploader } from "@/components/ObjectUploader";
import { api } from "@/lib/api";

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

export default function Vault() {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/documents'],
  });

  const handleGetUploadParameters = async () => {
    const response = await api.post('/api/documents/sign', {
      contentType: 'application/pdf',
      sha256: 'placeholder-hash',
      bytes: 1000000,
    });
    return {
      method: 'PUT' as const,
      url: response.data.url,
    };
  };

  const handleUploadComplete = async (result: any) => {
    if (result.successful.length > 0) {
      const upload = result.successful[0];
      await api.post('/api/documents', {
        kind: 'other',
        storage_key: upload.uploadURL,
        sha256: 'calculated-hash',
        bytes: upload.size || 1000000,
        content_type: upload.type || 'application/pdf',
        property_id: null,
        metadata: {},
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Document Vault" 
        subtitle="Secure storage for all property documents"
        actions={
          <ObjectUploader
            maxNumberOfFiles={5}
            maxFileSize={50 * 1024 * 1024} // 50MB
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleUploadComplete}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents
          </ObjectUploader>
        }
      />
      
      <main className="flex-1 p-8 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle>All Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                    <div className="h-3 w-20 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents yet</h3>
                <p className="text-gray-600 mb-4">Upload your first document to get started</p>
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={50 * 1024 * 1024}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleUploadComplete}
                  buttonClassName="bg-primary hover:bg-primary/90"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Documents
                </ObjectUploader>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: any) => {
                    const Icon = documentIcons[doc.kind as keyof typeof documentIcons];
                    const colorClass = documentColors[doc.kind as keyof typeof documentColors];
                    
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Document {doc.id.slice(0, 8)}</p>
                              <p className="text-xs text-gray-600 font-mono">SHA256: {doc.sha256.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {doc.property_id ? `Property ${doc.property_id.slice(0, 8)}` : 'Unassigned'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {doc.kind}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={doc.verified_by ? "default" : "secondary"}
                            className={doc.verified_by ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
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
                        <TableCell className="text-sm text-gray-600">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatFileSize(doc.bytes)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
