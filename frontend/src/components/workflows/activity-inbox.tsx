import { useQuery,useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { workflowRequest,saTime } from "@/lib/workflow-api";
import { Button } from "@/components/ui/button";

export default function ActivityInbox() {
  const query=useQuery<any>({queryKey:["/api/notifications"],refetchInterval:20000});
  const mark=useMutation({mutationFn:(id:string)=>workflowRequest("PATCH",`/api/notifications/${id}`),
    onSuccess:()=>queryClient.invalidateQueries({queryKey:["/api/notifications"]})});
  return <details className="my-4 border rounded-lg bg-white p-4">
    <summary className="cursor-pointer font-semibold">Inbox <span aria-live="polite">({query.data?.unread || 0} unread)</span></summary>
    {query.isError && <p role="alert">Notifications could not be loaded. <Button variant="outline" onClick={()=>query.refetch()}>Retry</Button></p>}
    {mark.isError && <p role="alert">The notification could not be marked read. Try again.</p>}
    <div className="space-y-3 mt-3">{(query.data?.items || []).slice(0,20).map((n:any)=><div className="border-t pt-3 flex flex-wrap gap-3 justify-between" key={n.id}>
      <div><Link className="text-blue-700 underline font-medium" href={n.path} onClick={()=>mark.mutate(n.id)}>{n.title}</Link><p>{n.message}</p><p className="text-xs text-gray-600">{saTime(n.created_at)}</p></div>
      {!n.read && <Button variant="outline" size="sm" disabled={mark.isPending} onClick={()=>mark.mutate(n.id)}>Mark read</Button>}
    </div>)}</div>
    {query.data && !query.data.items.length && <p className="mt-3 text-gray-600">No notifications yet. Due reminders and booking updates will appear here.</p>}
  </details>;
}
