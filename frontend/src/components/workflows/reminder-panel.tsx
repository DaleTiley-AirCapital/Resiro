import { useState } from "react";
import { useQuery,useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { workflowRequest,saTime,saInput,utcInput } from "@/lib/workflow-api";
import { useToast } from "@/hooks/use-toast";
import { Card,CardHeader,CardTitle,CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function ReminderPanel({propertyId,draft}:{propertyId:string;draft?:any}) {
  const path=`/api/properties/${propertyId}/reminders`;const {toast}=useToast();
  const query=useQuery<any[]>({queryKey:[path],refetchInterval:20000});
  const [editing,setEditing]=useState<any>(null);
  const create=useMutation({mutationFn:(data:any)=>workflowRequest("POST",path,data),
    onSuccess:()=>{queryClient.invalidateQueries({queryKey:[path]});toast({title:"Reminder saved"});},
    onError:(e:any)=>toast({title:"Reminder could not be saved",description:e.message,variant:"destructive"})});
  const update=useMutation({mutationFn:({item,action,due_at}:any)=>workflowRequest("PATCH",`/api/reminders/${item.id}`,{action,due_at,revision:item.revision}),
    onSuccess:()=>{setEditing(null);queryClient.invalidateQueries({queryKey:[path]});queryClient.invalidateQueries({queryKey:["/api/notifications"]});},
    onError:(e:any)=>toast({title:"Reminder could not be updated",description:e.message,variant:"destructive"})});
  return <Card><CardHeader><CardTitle>Actions &amp; Reminders</CardTitle></CardHeader><CardContent className="space-y-5">
    <p>Times are shown in South Africa time. Due reminders appear in your in-app inbox, including when you return after being away.</p>
    <form className="border rounded p-4 space-y-3" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);create.mutate({
      title:f.get("title"),description:f.get("description"),due_at:utcInput(String(f.get("due_at"))),recurrence:f.get("recurrence"),priority:f.get("priority")
    });}}>
      <h3 className="font-semibold">Create reminder</h3>
      <Label htmlFor="reminder-title">Reminder title</Label><Input id="reminder-title" name="title" defaultValue={draft?.title || ""} required maxLength={200} />
      <Label htmlFor="reminder-description">Details</Label><Textarea id="reminder-description" name="description" defaultValue={draft?.description || ""} maxLength={2000} />
      <Label htmlFor="reminder-due">Due date and time (South Africa)</Label><Input id="reminder-due" name="due_at" type="datetime-local" defaultValue={saInput(new Date(Date.now()+86400000).toISOString())} required />
      <div className="grid sm:grid-cols-2 gap-3"><div><Label htmlFor="recurrence">Repeat</Label><select className="w-full border rounded p-2" id="recurrence" name="recurrence" defaultValue="none">
        {["none","daily","weekly","monthly"].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
        <div><Label htmlFor="priority">Priority</Label><select className="w-full border rounded p-2" id="priority" name="priority"><option>normal</option><option>high</option></select></div></div>
      <Button disabled={create.isPending}>Save Reminder</Button>
    </form>
    {query.isError && <p role="alert">Reminders could not be loaded. <Button variant="outline" onClick={()=>query.refetch()}>Retry</Button></p>}
    {(query.data || []).map(item=><div className="border rounded p-4 space-y-3" key={item.id}>
      <div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">{item.title}</h3><Badge variant={item.overdue?"destructive":"outline"}>{item.overdue?"Overdue":item.status}</Badge></div>
      <p>{item.description}</p><p>{saTime(item.due_at)} · {item.recurrence}</p>
      {item.status==="open" && <div className="flex flex-wrap gap-2"><Button disabled={update.isPending} onClick={()=>update.mutate({item,action:"complete"})}>Complete reminder</Button>
        <Button variant="outline" onClick={()=>setEditing(item)}>Reschedule reminder</Button><Button variant="outline" disabled={update.isPending} onClick={()=>update.mutate({item,action:"cancel"})}>Cancel reminder</Button></div>}
      {editing?.id===item.id && <form className="space-y-3" onSubmit={e=>{e.preventDefault();update.mutate({item,action:"reschedule",due_at:utcInput(String(new FormData(e.currentTarget).get("due_at")))});}}>
        <Label htmlFor={`due-${item.id}`}>New due date (South Africa)</Label><Input id={`due-${item.id}`} name="due_at" type="datetime-local" defaultValue={saInput(item.due_at)} required />
        <Button disabled={update.isPending}>Save new due date</Button> <Button type="button" variant="outline" onClick={()=>setEditing(null)}>Close</Button>
      </form>}
    </div>)}
    {!query.isLoading && !query.data?.length && <p>No reminders yet.</p>}
  </CardContent></Card>;
}
