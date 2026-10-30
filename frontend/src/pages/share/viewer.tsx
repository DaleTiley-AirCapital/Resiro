import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ShareViewer() {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [submittedPassword, setSubmittedPassword] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const query = useQuery<any>({
    queryKey: ["public-share", token, submittedPassword],
    queryFn: async () => {
      const response = await fetch(`/api/public-shares/${token}`, {
        method: "POST", headers: {"Content-Type":"application/json"}, body:JSON.stringify({password:submittedPassword})
      });
      if (!response.ok) throw new Error(response.status === 401 ? "Enter the share password to continue." : "This share link is missing or expired.");
      return response.json();
    }, retry:false
  });
  const download = async (doc:any) => {
    setDownloadError("");
    try {
      const response=await fetch(`/api/public-shares/${token}/files/${doc.id}`,{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:submittedPassword})
      });
      if(!response.ok) throw new Error("Download failed. The link may have expired.");
      const url=URL.createObjectURL(await response.blob()); const a=document.createElement("a");
      a.href=url; a.download=doc.name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(e:any) {setDownloadError(e.message);}
  };
  return <main className="max-w-3xl mx-auto p-4 sm:p-8"><Card><CardHeader><CardTitle>Shared Job Documents</CardTitle></CardHeader><CardContent className="space-y-4">
    {query.isLoading && <p>Loading shared job...</p>}
    {query.error && <><p role="alert">{query.error.message}</p><form onSubmit={e=>{e.preventDefault();if(password===submittedPassword)query.refetch();else setSubmittedPassword(password);}} className="space-y-3">
      <Label htmlFor="password">Share password</Label><Input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} /><Button type="submit">Unlock</Button>
    </form></>}
    {query.data && <><h1 className="text-2xl font-bold">{query.data.job.property_address}</h1><p>{query.data.job.job_ref}</p><p>{query.data.job.description}</p><p>Link expires {new Date(query.data.expires_at).toLocaleString()}</p>
      {(query.data.job.documents || []).map((doc:any)=><div key={doc.id} className="border rounded p-4 flex flex-wrap justify-between gap-3"><span>{doc.name}</span><Button onClick={()=>download(doc)}>Download {doc.name}</Button></div>)}
      {!query.data.job.documents?.length && <p>No documents have been uploaded for this job.</p>}
    </>}
    {downloadError && <p role="alert">{downloadError}</p>}
    <a className="text-blue-700 underline block" href="/">Back to Resiro</a>
  </CardContent></Card></main>;
}
