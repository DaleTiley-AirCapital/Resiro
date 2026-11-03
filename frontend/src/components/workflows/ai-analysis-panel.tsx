import { useState } from "react";
import { useQuery,useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { workflowRequest,saTime,downloadWorkflow } from "@/lib/workflow-api";
import { useToast } from "@/hooks/use-toast";
import { Card,CardHeader,CardTitle,CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function AiAnalysisPanel({propertyId,documents,onReminder,onBooking}:{propertyId:string;documents:any[];onReminder:(draft:any)=>void;onBooking:(draft:any)=>void}) {
  const {toast}=useToast();const [selected,setSelected]=useState<string[]>([]);const [consent,setConsent]=useState(false);
  const path=`/api/properties/${propertyId}/analyses`;
  const status=useQuery<any>({queryKey:["/api/ai/status"],refetchInterval:30000});
  const runs=useQuery<any[]>({queryKey:[path],refetchInterval:10000});
  const fail=(e:any)=>toast({title:"Analysis action failed",description:e.message,variant:"destructive"});
  const refresh=()=>{queryClient.invalidateQueries({queryKey:[path]});queryClient.invalidateQueries({queryKey:["/api/ai/status"]});};
  const analyze=useMutation({mutationFn:()=>workflowRequest("POST",path,{document_ids:selected,consent}),
    onSuccess:()=>{refresh();toast({title:"AI draft ready",description:"Review the source quotes and suggested actions."});},
    onError:(e:any)=>{refresh();fail(e);}});
  const review=useMutation({mutationFn:({id,...data}:any)=>workflowRequest("PATCH",`${path}/${id}/review`,data),
    onSuccess:refresh,onError:fail});
  const running=analyze.isPending || runs.data?.some(r=>r.status==="running");
  return <Card><CardHeader><CardTitle>AI Document Analysis</CardTitle></CardHeader><CardContent className="space-y-5">
    <p>Select property documents to produce a draft review of policy clauses, dates, missing evidence, and maintenance requirements. Findings include source quotes. This does not decide insurance coverage or certify compliance.</p>
    {status.data&&!status.data.configured&&<p role="status" className="border rounded p-3 bg-amber-50">AI analysis is waiting for administrator setup. Your documents and other property tools remain available.</p>}
    {status.isError&&<p role="alert">AI availability could not be checked. <Button variant="outline" onClick={()=>status.refetch()}>Retry</Button></p>}
    {status.data&&<p>Analyses remaining today: {status.data.remaining} of {status.data.daily_limit}. Model: {status.data.model}.</p>}
    <form className="space-y-4" onSubmit={e=>{e.preventDefault();analyze.mutate();}}>
      <fieldset className="space-y-2"><legend className="font-semibold">Documents to analyze (up to five)</legend>
        {documents.map(doc=>{const supported=/\.(pdf|txt|md|csv|json)$/i.test(doc.name);return <label className="flex gap-3 items-start border rounded p-3" key={doc.id}>
          <input type="checkbox" checked={selected.includes(doc.id)} disabled={!supported||running} onChange={e=>setSelected(v=>e.target.checked?[...v,doc.id]:v.filter(id=>id!==doc.id))} />
          <span>{doc.name}{!supported&&" — upload a searchable PDF or text version for analysis"}</span></label>;})}
      </fieldset>
      {!documents.length&&<p>Upload a searchable PDF or text document in the Vault first.</p>}
      <label className="flex gap-3 items-start"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} /><span>I agree to send the text of the selected documents to OpenAI for this analysis.</span></label>
      <Button disabled={running||!status.data?.configured||!status.data.remaining||!consent||!selected.length||selected.length>5}>{running?"Analyzing documents…":"Analyze selected documents"}</Button>
    </form>
    {runs.isError&&<p role="alert">Analysis history could not be loaded.</p>}
    {(runs.data || []).map(run=><article className="border rounded p-4 space-y-3" key={run.id}>
      <div className="flex flex-wrap gap-3 justify-between"><h3 className="font-semibold">Analysis · {saTime(run.created_at)}</h3><Badge variant={run.status==="failed"?"destructive":"outline"}>{run.status} · {run.review_status}</Badge></div>
      <p className="text-xs">Model: {run.model} · Sources: {(run.sources || []).map((d:any)=>d.name).join(", ")}</p>
      {run.status==="running"&&<p>Analysis is in progress. You can refresh this page to check its status.</p>}
      {run.status==="failed"&&<p role="alert">{run.error}</p>}
      {run.result&&<><p>{run.result.summary}</p>{(run.result.findings || []).map((finding:any,i:number)=><div className="border-t pt-3 space-y-2" key={i}>
        <h4 className="font-semibold">{finding.title}</h4><p>{finding.explanation}</p>
        <blockquote className="border-l-4 pl-3 text-gray-700">{finding.quote}</blockquote>
        <p className="text-sm">{finding.document_name} · page {finding.page} · Quote matched to source</p>
        <p>Suggested next step: {finding.suggested_action}</p>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>downloadWorkflow(`/api/files/${finding.document_id}`,finding.document_name).catch(fail)}>Download source</Button>
          <Button variant="outline" onClick={()=>onReminder({title:finding.title,description:finding.suggested_action})}>Prepare reminder</Button>
          <Button variant="outline" onClick={()=>onBooking({title:finding.title,description:finding.suggested_action})}>Prepare booking request</Button></div>
      </div>)}
      <div><h4 className="font-semibold">Limitations</h4><ul className="list-disc pl-5">{(run.result.limitations || []).map((text:string,i:number)=><li key={i}>{text}</li>)}</ul></div>
      <form className="space-y-3" onSubmit={e=>{e.preventDefault();review.mutate({id:run.id,status:"reviewed",note:new FormData(e.currentTarget).get("note")});}}>
        <Label htmlFor={`review-${run.id}`}>Review note</Label><Textarea id={`review-${run.id}`} name="note" defaultValue={run.review_note || ""} maxLength={2000} />
        <Button disabled={review.isPending}>Mark reviewed</Button> <Button type="button" variant="outline" disabled={review.isPending} onClick={()=>review.mutate({id:run.id,status:"rejected",note:"Rejected during review"})}>Reject draft</Button>
      </form></>}
    </article>)}
  </CardContent></Card>;
}
