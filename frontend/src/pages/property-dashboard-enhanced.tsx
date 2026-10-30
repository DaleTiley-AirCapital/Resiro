import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const SAMPLES=["Sample_Title_Deed.pdf","Sample_Electrical_CoC.pdf","Sample_PIRB_CoC.pdf","Sample_SAQCC_Gas_CoC.pdf","Homeowners_Policy_Sample.pdf"];
export default function PropertyDashboardEnhanced() {
  const { id }=useParams(); const [,navigate]=useLocation(); const {toast}=useToast();
  const isDemo=id==="demo";
  const [busy,setBusy]=useState(false); const [shareDoc,setShareDoc]=useState<any>(null); const [shareUrl,setShareUrl]=useState("");
  const propertyQuery=useQuery<any>({queryKey:[`/api/properties/${id}`],enabled:!isDemo});
  const documentsQuery=useQuery<any[]>({queryKey:[`/api/properties/${id}/documents`],enabled:!isDemo});
  const property=isDemo?{name:"Demo Property",address:"123 Example Street, Gardens, Cape Town",dnaId:"DNA-DEMO-CT"}:propertyQuery.data;
  const documents=isDemo?SAMPLES.map(name=>({id:name,name,bytes:0,created_at:null,source:"sample"})):(documentsQuery.data || []);
  const fail=(e:any)=>toast({title:"Action failed",description:e.message,variant:"destructive"});
  const openDocument=async(doc:any,download:boolean)=>{
    if(isDemo) { const a=document.createElement("a"); a.href=`/demo_docs/${doc.name}`;a.target="_blank";a.rel="noreferrer";if(download)a.download=doc.name;a.click();return; }
    try {
      const response=await fetch(`/api/files/${doc.id}`,{headers:{Authorization:`Bearer ${localStorage.getItem("auth_token")}`}});
      if(!response.ok) throw new Error("Document could not be downloaded");
      const blob=await response.blob();
      const type=doc.name.toLowerCase().endsWith(".pdf")?"application/pdf":"application/octet-stream";
      const url=URL.createObjectURL(new Blob([blob],{type}));
      const a=document.createElement("a");a.href=url;
      if(download || type==="application/octet-stream")a.download=doc.name;else {a.target="_blank";a.rel="noreferrer";}
      a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){fail(e);}
  };
  const upload=async(file:File)=>{
    setBusy(true);
    try{
      const body=new FormData();body.append("file",file);body.append("propertyId",id!);
      const response=await fetch("/api/files",{method:"POST",body,headers:{Authorization:`Bearer ${localStorage.getItem("auth_token")}`}});
      if(!response.ok)throw new Error((await response.json()).error || "Upload failed");
      await queryClient.invalidateQueries({queryKey:[`/api/properties/${id}/documents`]});
      await queryClient.invalidateQueries({queryKey:["/api/properties"]});
      toast({title:"Document uploaded"});
    }catch(e){fail(e);}finally{setBusy(false);}
  };
  if(propertyQuery.isLoading && !isDemo)return <main className="p-8">Loading property...</main>;
  if(!property)return <main className="p-8"><p role="alert">Property could not be loaded.</p><Button onClick={()=>navigate("/app")}>Back to Dashboard</Button></main>;
  return <main className="container mx-auto p-4 sm:p-8 max-w-6xl">
    <Button variant="outline" onClick={()=>navigate("/app")}>Back to Dashboard</Button>
    <header className="my-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">{property.name}</h1><p>{property.address}</p></div><Badge variant="outline">{property.dnaId}</Badge></header>
    {isDemo && <p className="p-3 mb-4 border rounded bg-blue-50">Sample property and documents for exploring the dashboard. These are illustrative, unverified examples. Add your own property to save documents.</p>}
    <Tabs defaultValue="vault"><TabsList className="flex w-full justify-start overflow-x-auto h-auto">{[["vault","Vault"],["policy","Policy Check"],["actions","Actions"],["vendors","Vendors"],["services","Services"]].map(([value,label])=><TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}</TabsList>
      <TabsContent value="vault"><Card><CardHeader><CardTitle>Document Vault</CardTitle></CardHeader><CardContent className="space-y-4">
        {isDemo?<Button onClick={()=>navigate("/properties/new")}>Add Your Own Property</Button>:<div><Label htmlFor="property-upload">Upload document (up to 10 MB)</Label><Input id="property-upload" type="file" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value="";}} /></div>}
        {documentsQuery.error && <p role="alert">Documents could not be loaded. Refresh to retry.</p>}
        {documents.map(doc=><div key={doc.id} className="border rounded p-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{doc.name}</h3><Badge variant="outline">{isDemo?"Sample":"Uploaded · not verified"}</Badge></div><div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={()=>openDocument(doc,false)}>View</Button><Button variant="outline" onClick={()=>openDocument(doc,true)}>Download</Button>
          {!isDemo && <Button variant="outline" onClick={()=>{setShareDoc(doc);setShareUrl("");}}>Share</Button>}
        </div></div>{!isDemo && <p className="text-xs break-all">SHA-256: {doc.sha256}</p>}</div>)}
        {!documents.length && !documentsQuery.isLoading && <p>No documents uploaded yet.</p>}
      </CardContent></Card></TabsContent>
      <TabsContent value="policy"><Card><CardHeader><CardTitle>Insurance Policy Compliance</CardTitle></CardHeader><CardContent className="space-y-4"><p>Not evaluated. Automated policy analysis is not connected in this version.</p><p>Uploaded documents have not been verified for insurance, legal or regulatory compliance.</p>{isDemo && <a className="text-blue-700 underline" href="/demo_docs/Homeowners_Policy_Sample.pdf" target="_blank" rel="noreferrer">View sample homeowners policy</a>}</CardContent></Card></TabsContent>
      <TabsContent value="actions"><Card><CardHeader><CardTitle>Actions &amp; Reminders</CardTitle></CardHeader><CardContent><p>Document reminders and scheduling are not connected in this version. No reminders have been scheduled.</p></CardContent></Card></TabsContent>
      <TabsContent value="vendors"><Card><CardHeader><CardTitle>Connected Vendors</CardTitle></CardHeader><CardContent><p>No vendors are connected to this property. Vendor invitations are not connected in this version.</p></CardContent></Card></TabsContent>
      <TabsContent value="services"><Card><CardHeader><CardTitle>Property Services</CardTitle></CardHeader><CardContent><p>Provider booking and consultations are not connected in this version. No service request has been sent.</p></CardContent></Card></TabsContent>
    </Tabs>
    {shareDoc && <Card className="mt-6"><CardHeader><CardTitle>Share {shareDoc.name}</CardTitle></CardHeader><CardContent>
      <form className="space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);try{
        const result=await (await apiRequest("POST",`/api/files/${shareDoc.id}/share`,{password:new FormData(e.currentTarget).get("password")})).json();
        setShareUrl(`${window.location.origin}/share/${result.token}`);
      }catch(e){fail(e);}finally{setBusy(false);}}}>
        <Label htmlFor="file-share-password">Optional share password (link expires in 7 days)</Label><Input id="file-share-password" name="password" type="password" autoComplete="new-password" />
        <Button disabled={busy}>Generate Share Link</Button> <Button type="button" variant="outline" onClick={()=>setShareDoc(null)}>Close</Button>
        {shareUrl && <><Label htmlFor="file-share-url">Share link</Label><Input id="file-share-url" value={shareUrl} readOnly /><a className="text-blue-700 underline block" href={shareUrl} target="_blank" rel="noreferrer">Open shared document</a></>}
      </form>
    </CardContent></Card>}
  </main>;
}
