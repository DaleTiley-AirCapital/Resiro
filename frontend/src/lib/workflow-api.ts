import { apiRequest } from "@/lib/queryClient";
export async function workflowRequest(method:string,path:string,data?:any) {
  const response=await apiRequest(method,path,data);
  return response.json();
}
export const saTime=(value:string)=>new Intl.DateTimeFormat("en-ZA",{timeZone:"Africa/Johannesburg",dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
export const saInput=(value?:string)=>new Date((value?new Date(value).getTime():Date.now())+7200000).toISOString().slice(0,16);
export const utcInput=(value:string)=>new Date(value+"+02:00").toISOString();
export async function downloadWorkflow(path:string,name:string) {
  const response=await fetch(path,{headers:{Authorization:`Bearer ${localStorage.getItem("auth_token")}`}});
  if(!response.ok)throw new Error("Download failed");
  const url=URL.createObjectURL(await response.blob());const a=document.createElement("a");a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
