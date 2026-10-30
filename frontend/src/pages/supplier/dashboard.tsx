import BookingPanel from "@/components/workflows/booking-panel";
import ActivityInbox from "@/components/workflows/activity-inbox";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/logo";

async function request(method: string, path: string, data?: any) {
  return (await apiRequest(method, path, data)).json();
}
async function downloadFile(doc: any) {
  const response = await fetch(doc.download_url, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } });
  if (!response.ok) throw new Error("Document could not be downloaded");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a"); link.href = url; link.download = doc.name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const INITIAL_TEMPLATE = { id: "", name: "Roofing Service Report", category: "Roofing", version: "1.0" };

export default function SupplierDashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState("profile");
  const [showJobForm, setShowJobForm] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [shareJob, setShareJob] = useState<any>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [busyUpload, setBusyUpload] = useState(false);
  const profileQuery = useQuery<any>({ queryKey: ["/api/supplier/profile"] });
  const jobsQuery = useQuery<any[]>({ queryKey: ["/api/supplier/jobs"] });
  const templatesQuery = useQuery<any[]>({ queryKey: ["/api/supplier/templates"] });
  const documentsQuery = useQuery<any[]>({ queryKey: ["/api/supplier/documents"] });
  const settingsQuery = useQuery<any>({ queryKey: ["/api/supplier/settings"] });
  const profile = profileQuery.data;
  const jobs = jobsQuery.data || [];
  const templates = templatesQuery.data || [];
  const fail = (error: any) => toast({ title: "Action failed", description: error.message, variant: "destructive" });
  const mutation = useMutation({
    mutationFn: ({ method, path, data }: any) => request(method, path, data),
    onError: fail,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.path] });
      toast({ title: "Saved", description: "Your changes have been saved." });
      if (variables.path === "/api/supplier/jobs") setShowJobForm(false);
      if (variables.path === "/api/supplier/templates") setTemplate(null);
    }
  });
  const upload = async (file: File, jobId?: string) => {
    setBusyUpload(true);
    try {
      const body = new FormData(); body.append("file", file);
      if (jobId) body.append("jobId", jobId);
      const response = await fetch("/api/files", { method: "POST", body,
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } });
      if (!response.ok) throw new Error((await response.json()).error || "Upload failed");
      await queryClient.invalidateQueries({ queryKey: [jobId ? "/api/supplier/jobs" : "/api/supplier/documents"] });
      toast({ title: "Document uploaded" });
    } catch (e) { fail(e); } finally { setBusyUpload(false); }
  };
  const submit = (event: any, path: string, extra: any = {}) => {
    event.preventDefault();
    mutation.mutate({ method: path.endsWith("jobs") || path.endsWith("templates") ? "POST" : "PUT",
      path, data: { ...Object.fromEntries(new FormData(event.currentTarget)), ...(path.endsWith("/profile")?{accept_bookings:new FormData(event.currentTarget).get("accept_bookings")==="on"}:{}), ...extra } });
  };
  if (user?.userType !== "supplier") return <main className="p-8"><h1>Supplier access required</h1><Button onClick={() => navigate("/app")}>Back to dashboard</Button></main>;
  const errors = [profileQuery, jobsQuery, templatesQuery, documentsQuery, settingsQuery].some(q => q.isError);
  return <main className="container mx-auto p-4 sm:p-8 max-w-6xl">
    <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-4"><Logo /><div><h1 className="text-3xl font-bold">Supplier Console</h1><p>Manage your business profile, jobs, and documents</p></div></div>
      <Button variant="outline" onClick={() => { logout(); navigate("/login"); }}>Sign out</Button>
    </header>
    {user.id === "00000000-0000-0000-0000-000000000002" && <p className="p-3 mb-4 bg-blue-50 border rounded">Shared demo account. Saved changes are visible to other demo visitors. Use sample documents only.</p>}
    {errors && <p role="alert" className="p-4 text-red-700">Supplier data could not be loaded. <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>Retry</Button></p>}
    <ActivityInbox />
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="flex w-full justify-start overflow-x-auto h-auto">
        {["profile","insurance","templates","jobs","bookings","settings"].map(t => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}
      </TabsList>
      <TabsContent value="profile"><Card><CardHeader><CardTitle>Business Profile</CardTitle><CardDescription>Your business information and branding</CardDescription></CardHeader><CardContent>
        {profileQuery.isLoading ? <p>Loading profile...</p> : <form key={JSON.stringify(profile)} onSubmit={e => submit(e, "/api/supplier/profile")} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">{[["company_name","Company Name"],["registration_number","Registration Number"],["email","Business Email"],["phone","Business Phone"],["website","Website"]].map(([name,label]) =>
            <div key={name}><Label htmlFor={name}>{label}</Label><Input id={name} name={name} required={name === "company_name"} type={name === "email" ? "email" : "text"} defaultValue={profile?.[name] || ""} /></div>)}</div>
          <div><Label htmlFor="business-description">Business Description</Label><Textarea id="business-description" name="description" defaultValue={profile?.description || ""} /></div>
          <div><Label htmlFor="specialties">Specialties (comma-separated)</Label><Input id="specialties" name="specialties" defaultValue={profile?.specialties?.join(", ") || ""} /></div>
          <label className="flex items-start gap-3"><input type="checkbox" name="accept_bookings" defaultChecked={profile?.accept_bookings ?? user.id==="00000000-0000-0000-0000-000000000002"} /><span>Accept booking requests and show my business name and specialties in the supplier directory.</span></label>
          <Button disabled={mutation.isPending} type="submit">Save Profile</Button>
        </form>}
      </CardContent></Card></TabsContent>
      <TabsContent value="insurance"><Card><CardHeader><CardTitle>Insurance &amp; Certifications</CardTitle><CardDescription>Store your documents here. Uploading does not verify coverage or validity.</CardDescription></CardHeader><CardContent className="space-y-4">
        <Label htmlFor="insurance-file">Upload a document (up to 10 MB)</Label>
        <Input id="insurance-file" type="file" disabled={busyUpload} onChange={e => { const file=e.target.files?.[0]; if(file) void upload(file); e.target.value=""; }} />
        {(documentsQuery.data || []).map(doc => <div className="border rounded p-4 flex flex-wrap justify-between gap-2" key={doc.id}><div><p>{doc.name}</p><Badge variant="outline">Not verified</Badge></div><Button variant="outline" onClick={() => downloadFile(doc).catch(fail)}>Download {doc.name}</Button></div>)}
        {!documentsQuery.isLoading && !documentsQuery.data?.length && <p>No insurance or certification documents uploaded.</p>}
      </CardContent></Card></TabsContent>
      <TabsContent value="templates"><Card><CardHeader><CardTitle>Document Templates</CardTitle><CardDescription>Save reusable job names and categories.</CardDescription></CardHeader><CardContent className="space-y-4">
        {(templates.length ? templates : [INITIAL_TEMPLATE]).map(item => <div className="border rounded p-4 flex flex-wrap gap-4 justify-between" key={item.id || "starter"}>
          <div><h3 className="font-semibold">{item.name}</h3><p>{item.category} · v{item.version}</p></div>
          <div className="flex gap-2"><Button variant="outline" onClick={() => setTemplate(item)}>Edit</Button><Button onClick={() => { setSelectedTemplate(item.name); setShowJobForm(true); setTab("jobs"); }}>Use Template</Button></div>
        </div>)}
        <Button variant="outline" onClick={() => setTemplate({ id:"", name:"", category:"" })}>Create New Template</Button>
        {template && <form className="space-y-4 border p-4 rounded" onSubmit={e => submit(e,"/api/supplier/templates",{id:template.id})}>
          <Label htmlFor="template-name">Template Name</Label><Input id="template-name" name="name" defaultValue={template.name} required />
          <Label htmlFor="template-category">Category</Label><Input id="template-category" name="category" defaultValue={template.category} />
          <Button type="submit" disabled={mutation.isPending}>Save Template</Button> <Button type="button" variant="outline" onClick={() => setTemplate(null)}>Cancel</Button>
        </form>}
      </CardContent></Card></TabsContent>
      <TabsContent value="jobs"><Card><CardHeader><div className="flex justify-between"><CardTitle>Jobs</CardTitle><Button onClick={() => { setSelectedTemplate(""); setShowJobForm(true); }}>New Job</Button></div></CardHeader><CardContent className="space-y-4">
        {showJobForm && <form className="space-y-4 border rounded p-4" onSubmit={e => submit(e,"/api/supplier/jobs",{template_name:selectedTemplate})}>
          <h3 className="font-semibold">Create New Job</h3>{selectedTemplate && <p>Template: {selectedTemplate}</p>}
          <Label htmlFor="property_address">Property Address</Label><Input id="property_address" name="property_address" required />
          <Label htmlFor="client_name">Client Name</Label><Input id="client_name" name="client_name" required />
          <Label htmlFor="job-description">Job Description</Label><Textarea id="job-description" name="description" required />
          <Button type="submit" disabled={mutation.isPending}>Create Job</Button> <Button type="button" variant="outline" onClick={() => setShowJobForm(false)}>Cancel</Button>
        </form>}
        {jobs.map(job => <div className="border rounded p-4 space-y-3" key={job.id}>
          <h3 className="font-semibold">{job.property_address}</h3><Badge variant="outline">{job.job_ref}</Badge><p>{job.client_name}</p><p>{job.description}</p>
          <p className="text-sm text-gray-600">{job.document_count} documents · {new Date(job.created_at).toLocaleDateString()}</p>
          <Button variant="outline" onClick={() => { setShareJob(job); setShareUrl(""); }}>Share</Button>
          <Label htmlFor={`upload-${job.id}`} className="block">Upload job document (up to 10 MB)</Label><Input id={`upload-${job.id}`} type="file" disabled={busyUpload} onChange={e => { const f=e.target.files?.[0]; if(f) void upload(f,job.id); e.target.value=""; }} />
          {(job.documents || []).map((doc:any) => <div key={doc.id} className="flex flex-wrap justify-between gap-2 border-t pt-2"><span>{doc.name}</span><Button variant="outline" onClick={() => downloadFile(doc).catch(fail)}>Download {doc.name}</Button></div>)}
        </div>)}
        {!jobsQuery.isLoading && !jobs.length && <p>No jobs yet. Create your first job to get started.</p>}
        {shareJob && <form className="space-y-3 border rounded p-4" onSubmit={async e => {
          e.preventDefault(); const password = new FormData(e.currentTarget).get("password");
          try { const result=await request("POST",`/api/supplier/jobs/${shareJob.id}/share`,{password});
            setShareUrl(`${window.location.origin}/share/${result.token}`); toast({title:"Share link created"}); } catch(e) { fail(e); }
        }}>
          <h3>Share job: {shareJob.property_address}</h3><Label htmlFor="share-password">Optional share password</Label><Input id="share-password" name="password" type="password" autoComplete="new-password" />
          <Button type="submit">Generate Share Link</Button> <Button type="button" variant="outline" onClick={() => setShareJob(null)}>Close</Button>
          {shareUrl && <div><Label htmlFor="share-url">Share link</Label><Input id="share-url" value={shareUrl} readOnly /><a className="text-blue-700 underline" href={shareUrl} target="_blank" rel="noreferrer">Open shared job</a></div>}
        </form>}
      </CardContent></Card></TabsContent>
      <TabsContent value="bookings"><BookingPanel supplier /></TabsContent>
      <TabsContent value="settings"><Card><CardHeader><CardTitle>Settings</CardTitle><CardDescription>Choose when newly generated share links expire. Passwords can be added when creating a link.</CardDescription></CardHeader><CardContent>
        <form key={settingsQuery.data?.expire_after_days} className="space-y-4" onSubmit={e => submit(e,"/api/supplier/settings")}>
          <Label htmlFor="expire_after_days">Share expiry (days)</Label><Input id="expire_after_days" type="number" min="1" max="30" name="expire_after_days" defaultValue={settingsQuery.data?.expire_after_days || 7} required />
          <Button type="submit" disabled={mutation.isPending}>Save Settings</Button>
        </form>
      </CardContent></Card></TabsContent>
    </Tabs>
  </main>;
}
