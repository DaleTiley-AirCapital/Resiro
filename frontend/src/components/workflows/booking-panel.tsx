import { useState } from "react";
import { useQuery,useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { workflowRequest,saTime,saInput,downloadWorkflow } from "@/lib/workflow-api";
import { useToast } from "@/hooks/use-toast";
import { Card,CardHeader,CardTitle,CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function BookingPanel({propertyId,supplier=false,draft}:{propertyId?:string;supplier?:boolean;draft?:any}) {
  const {toast}=useToast();const fail=(e:any)=>toast({title:"Booking action failed",description:e.message,variant:"destructive"});
  const [provider,setProvider]=useState("");const [date,setDate]=useState(saInput(new Date(Date.now()+86400000).toISOString()).slice(0,10));
  const [duration,setDuration]=useState(60);const [slot,setSlot]=useState("");const [editing,setEditing]=useState<any>(null);
  const path=supplier?"/api/supplier/bookings":`/api/properties/${propertyId}/bookings`;
  const query=useQuery<any[]>({queryKey:[path],refetchInterval:15000});
  const providers=useQuery<any[]>({queryKey:["/api/suppliers"],enabled:!supplier});
  const settings=useQuery<any>({queryKey:["/api/supplier/booking-settings"],enabled:supplier});
  const availability=useQuery<any>({queryKey:[`/api/suppliers/${provider}/availability?date=${date}&duration=${duration}`],enabled:!supplier&&!!provider&&!!date});
  const refresh=()=>{queryClient.invalidateQueries({queryKey:[path]});queryClient.invalidateQueries({queryKey:["/api/notifications"]});queryClient.invalidateQueries({predicate:q=>String(q.queryKey[0]).includes("/availability?")});};
  const action=useMutation({mutationFn:({item,action,...rest}:any)=>workflowRequest("PATCH",`/api/bookings/${item.id}`,{action,revision:item.revision,...rest}),
    onSuccess:()=>{setEditing(null);refresh();toast({title:"Booking updated"});},onError:fail});
  const create=useMutation({mutationFn:(data:any)=>workflowRequest("POST",path,data),onSuccess:()=>{refresh();setSlot("");toast({title:"Booking requested",description:"Your supplier must confirm the appointment."});},onError:fail});
  const saveSettings=useMutation({mutationFn:(data:any)=>workflowRequest("PUT","/api/supplier/booking-settings",data),
    onSuccess:()=>{queryClient.invalidateQueries({queryKey:["/api/supplier/booking-settings"]});toast({title:"Availability saved"});},onError:fail});
  const active=(item:any)=>["requested","confirmed"].includes(item.status);
  return <Card><CardHeader><CardTitle>{supplier?"Booking Requests & Appointments":"Book a Property Service"}</CardTitle></CardHeader><CardContent className="space-y-5">
    <p>Requests require supplier confirmation. Updates appear in each account’s inbox. All times use South Africa time.</p>
    {supplier && <details className="border rounded p-4"><summary className="cursor-pointer font-semibold">Working hours</summary>
      <form className="space-y-3 mt-3" key={JSON.stringify(settings.data)} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);
        saveSettings.mutate({open_hour:Number(f.get("open_hour")),close_hour:Number(f.get("close_hour")),weekdays:f.getAll("weekdays").map(Number)});}}>
        <div className="grid sm:grid-cols-2 gap-3"><div><Label htmlFor="open-hour">Opening hour (0–23)</Label><Input id="open-hour" name="open_hour" type="number" min="0" max="22" defaultValue={settings.data?.open_hour ?? 8} required /></div>
          <div><Label htmlFor="close-hour">Closing hour (1–23)</Label><Input id="close-hour" name="close_hour" type="number" min="1" max="23" defaultValue={settings.data?.close_hour ?? 17} required /></div></div>
        <fieldset><legend>Working days</legend><div className="flex flex-wrap gap-3">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day,i)=><label key={day} className="flex gap-2 items-center">
          <input type="checkbox" name="weekdays" value={i} defaultChecked={(settings.data?.weekdays || [1,2,3,4,5]).includes(i)} />{day}</label>)}</div></fieldset>
        <Button disabled={saveSettings.isPending}>Save Availability</Button>
      </form>{settings.isError && <p role="alert">Working hours could not be loaded.</p>}
    </details>}
    {!supplier && <form className="space-y-3 border rounded p-4" key={editing?.id || draft?.title || "new"} onSubmit={e=>{
      e.preventDefault();const f=new FormData(e.currentTarget);const chosen=availability.data?.slots.find((s:any)=>s.start_at===slot);
      if(!chosen){fail(new Error("Choose an available appointment time"));return;}
      const data={title:f.get("title"),description:f.get("description"),supplier_org_id:provider,start_at:chosen.start_at,end_at:chosen.end_at};
      if(editing)action.mutate({item:editing,action:"reschedule",...data});else create.mutate(data);
    }}>
      <h3 className="font-semibold">{editing?"Request a new appointment time":"Request appointment"}</h3>
      <Label htmlFor="booking-title">Service required</Label><Input id="booking-title" name="title" defaultValue={editing?.title || draft?.title || ""} required maxLength={200} />
      <Label htmlFor="booking-description">Details shared with the supplier</Label><Textarea id="booking-description" name="description" defaultValue={editing?.description || draft?.description || ""} maxLength={2000} />
      <Label htmlFor="booking-supplier">Supplier</Label><select className="w-full border rounded p-2" id="booking-supplier" value={provider} disabled={!!editing} onChange={e=>{setProvider(e.target.value);setSlot("");}} required>
        <option value="">Choose a supplier</option>{(providers.data || []).map(p=><option key={p.id} value={p.id}>{p.name}{p.demo?" (Demo)":""}</option>)}</select>
      {providers.isError && <p role="alert">Suppliers could not be loaded.</p>}
      {!providers.isLoading&&!providers.data?.length && <p>No suppliers have enabled bookings yet.</p>}
      <div className="grid sm:grid-cols-2 gap-3"><div><Label htmlFor="booking-date">Appointment date</Label><Input id="booking-date" type="date" value={date} onChange={e=>{setDate(e.target.value);setSlot("");}} required /></div>
        <div><Label htmlFor="booking-duration">Duration</Label><select className="w-full border rounded p-2" id="booking-duration" value={duration} onChange={e=>{setDuration(Number(e.target.value));setSlot("");}}>{[30,60,90,120,180,240].map(n=><option key={n} value={n}>{n} minutes</option>)}</select></div></div>
      <Label htmlFor="booking-slot">Available time</Label><select className="w-full border rounded p-2" id="booking-slot" value={slot} onChange={e=>setSlot(e.target.value)} required>
        <option value="">Choose a time</option>{(availability.data?.slots || []).map((s:any)=><option key={s.start_at} value={s.start_at}>{saTime(s.start_at)}</option>)}</select>
      {availability.isError && <p role="alert">Available times could not be loaded.</p>}
      {provider&&availability.data&&!availability.data.slots.length && <p>No times available on this date. Choose another date.</p>}
      <Button disabled={create.isPending||action.isPending||!slot}>{editing?"Request reschedule":"Request Booking"}</Button>
      {editing&&<Button type="button" variant="outline" onClick={()=>{setEditing(null);setSlot("");}}>Cancel reschedule</Button>}
    </form>}
    {query.isError && <p role="alert">Bookings could not be loaded. <Button variant="outline" onClick={()=>query.refetch()}>Retry</Button></p>}
    {(query.data || []).slice().sort((a,b)=>new Date(a.start_at).getTime()-new Date(b.start_at).getTime()).map(item=><div className="border rounded p-4 space-y-3" key={item.id}>
      <div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">{item.title}</h3><Badge variant="outline">{item.status}</Badge></div>
      <p>{supplier?item.owner_name:item.supplier_name}</p><p>{item.property_address}</p><p>{saTime(item.start_at)} – {saTime(item.end_at)}</p><p>{item.description}</p>
      {item.note&&<p>Latest note: {item.note}</p>}
      <div className="flex flex-wrap gap-2">
        {supplier&&item.status==="requested"&&<><Button disabled={action.isPending} onClick={()=>action.mutate({item,action:"accept"})}>Accept booking</Button><Button variant="outline" disabled={action.isPending} onClick={()=>action.mutate({item,action:"decline"})}>Decline booking</Button></>}
        {supplier&&item.status==="confirmed"&&<Button disabled={action.isPending||new Date(item.start_at)>new Date()} onClick={()=>action.mutate({item,action:"complete"})}>Complete appointment</Button>}
        {!supplier&&active(item)&&<Button variant="outline" onClick={()=>{setEditing(item);setProvider(item.supplier_org_id);setDate(saInput(item.start_at).slice(0,10));setDuration((new Date(item.end_at).getTime()-new Date(item.start_at).getTime())/60000);setSlot("");}}>Reschedule booking</Button>}
        {active(item)&&<Button variant="outline" disabled={action.isPending} onClick={()=>action.mutate({item,action:"cancel"})}>Cancel booking</Button>}
        <Button variant="outline" onClick={()=>downloadWorkflow(`/api/bookings/${item.id}/calendar`,"resiro-booking.ics").catch(fail)}>Download calendar event</Button>
      </div>
      <details><summary className="cursor-pointer">Booking history</summary>{(item.events || []).map((event:any,i:number)=><p key={i} className="text-sm">{event.status} · {saTime(event.at)}</p>)}</details>
    </div>)}
    {!query.isLoading&&!query.data?.length&&<p>No bookings yet.</p>}
  </CardContent></Card>;
}
