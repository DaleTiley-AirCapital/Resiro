import assert from "node:assert/strict";
import {writeFile} from "node:fs/promises";
const base=process.env.RESIRO_BASE_URL || "https://resiro-web-production.up.railway.app";
const checks=[];function check(name,condition){assert.ok(condition,name);checks.push(name);console.log("PASS "+name);}
async function request(path,{token,method="GET",data,form}={}){
 const headers={};if(token)headers.Authorization="Bearer "+token;
 let body=form;if(data!==undefined){headers["Content-Type"]="application/json";body=JSON.stringify(data);}
 const response=await fetch(base+path,{method,headers,body});
 const contentType=response.headers.get("content-type")||"";
 const value=contentType.includes("application/json")?await response.json():await response.text();
 return {status:response.status,value,contentType};
}
const owner=await request("/api/auth/login",{method:"POST",data:{email:"dale.tiley@email.com",password:"demo123"}});
check("owner demo login and string user type",owner.status===200&&owner.value.user.userType==="homeowner");
const supplier=await request("/api/auth/login",{method:"POST",data:{email:"info@millenniumroofing.co.za",password:"supplier123"}});
check("supplier demo login and string user type",supplier.status===200&&supplier.value.user.userType==="supplier");
const ot=owner.value.token,st=supplier.value.token;
for(const [name,token,type] of [["owner",ot,"homeowner"],["supplier",st,"supplier"]]){
 const me=await request("/api/auth/me",{token});check(name+" session restoration",me.status===200&&me.value.user.userType===type&&!!me.value.organization?.id);
}
const bad=await request("/api/auth/login",{method:"POST",data:{email:"dale.tiley@email.com",password:"incorrect"}});
check("incorrect password rejected",bad.status===401);
check("anonymous property access rejected",(await request("/api/properties")).status===401);
check("owner cannot use supplier endpoints",(await request("/api/supplier/profile",{token:ot})).status===403);
const missing=await request("/api/not-a-real-endpoint");check("missing API is JSON 404",missing.status===404&&missing.contentType.includes("json"));
const stamp=Date.now();
const property=await request("/api/properties",{method:"POST",token:ot,data:{name:"Demo verification property",address:"123 Demo Street, Cape Town",country:"ZA",municipality:"Cape Town",township:"Demo",parcelId:"DEMO-"+stamp}});
check("owner property creation",property.status===201&&!!property.value.dnaId);
const pid=property.value.id;
check("property list contains saved property",(await request("/api/properties",{token:ot})).value.some(p=>p.id===pid));
check("supplier cannot read owner's property",(await request("/api/properties/"+pid,{token:st})).status===404);
const form=new FormData();form.append("file",new Blob(["Resiro demonstration document\n"],{type:"text/plain"}),"Demo-verification.txt");form.append("propertyId",pid);
const file=await request("/api/files",{method:"POST",token:ot,form});
check("owner document upload",file.status===200&&!!file.value.sha256);
const fid=file.value.id;
check("portfolio document count",(await request("/api/properties",{token:ot})).value.find(p=>p.id===pid).documentsCount===1);
check("owner document list",(await request("/api/properties/"+pid+"/documents",{token:ot})).value.some(d=>d.id===fid));
check("owner document download",(await request("/api/files/"+fid,{token:ot})).value==="Resiro demonstration document\n");
check("supplier cannot download owner's document",(await request("/api/files/"+fid,{token:st})).status===404);
const profile={company_name:"Millennium Roofing (Pty) Ltd",registration_number:"DEMO",description:"Demonstration supplier profile",email:"info@millenniumroofing.co.za",phone:"",website:"",specialties:"Roofing, Waterproofing"};
check("supplier profile save",(await request("/api/supplier/profile",{token:st,method:"PUT",data:profile})).status===200);
check("supplier profile read",(await request("/api/supplier/profile",{token:st})).value.company_name===profile.company_name);
check("supplier settings save",(await request("/api/supplier/settings",{token:st,method:"PUT",data:{expire_after_days:3}})).status===200);
check("supplier settings read",(await request("/api/supplier/settings",{token:st})).value.expire_after_days===3);
const template=await request("/api/supplier/templates",{token:st,method:"POST",data:{name:"Demo roof inspection",category:"Roofing"}});
check("supplier template save",template.status===200&&!!template.value.id);
const edit=await request("/api/supplier/templates",{token:st,method:"POST",data:{id:template.value.id,name:"Demo roof inspection",category:"Roof maintenance"}});
check("supplier template edit",edit.status===200&&edit.value.id===template.value.id);
check("supplier template read",(await request("/api/supplier/templates",{token:st})).value.some(t=>t.id===template.value.id&&t.category==="Roof maintenance"));
const job=await request("/api/supplier/jobs",{token:st,method:"POST",data:{property_address:"123 Demo Street, Cape Town",client_name:"Demo Client",description:"Demo roof inspection",template_name:"Demo roof inspection"}});
check("supplier job creation",job.status===200&&job.value.job_ref.startsWith("JOB-"));
const jid=job.value.id;
const jf=new FormData();jf.append("file",new Blob(["Demo supplier inspection\n"],{type:"text/plain"}),"Demo-inspection.txt");jf.append("jobId",jid);
const jfile=await request("/api/files",{method:"POST",token:st,form:jf});
check("supplier job document upload",jfile.status===200);
const savedJobs=await request("/api/supplier/jobs",{token:st});
check("job document count persisted",savedJobs.value.find(j=>j.id===jid).document_count===1);
check("supplier job document download",(await request("/api/files/"+jfile.value.id,{token:st})).value==="Demo supplier inspection\n");
check("owner cannot download supplier document",(await request("/api/files/"+jfile.value.id,{token:ot})).status===404);
const insurance=new FormData();insurance.append("file",new Blob(["Illustrative certificate, not valid insurance"],{type:"text/plain"}),"Demo-certificate.txt");
check("supplier insurance document upload",(await request("/api/files",{method:"POST",token:st,form:insurance})).status===200);
check("supplier insurance document list",(await request("/api/supplier/documents",{token:st})).value.some(d=>d.name==="Demo-certificate.txt"));
const share=await request("/api/supplier/jobs/"+jid+"/share",{token:st,method:"POST",data:{password:"demo-share-pass"}});
check("password-protected share created",share.status===200&&share.value.token.length===48);
const sharePath="/api/public-shares/"+share.value.token;
check("share rejects missing password",(await request(sharePath,{method:"POST",data:{}})).status===401);
check("share rejects wrong password",(await request(sharePath,{method:"POST",data:{password:"wrong"}})).status===401);
const opened=await request(sharePath,{method:"POST",data:{password:"demo-share-pass"}});
check("share unlocks correct job",opened.status===200&&opened.value.job.id===jid);
check("share document download",(await request(sharePath+"/files/"+jfile.value.id,{method:"POST",data:{password:"demo-share-pass"}})).value==="Demo supplier inspection\n");
check("share cannot download another document",(await request(sharePath+"/files/"+fid,{method:"POST",data:{password:"demo-share-pass"}})).status===404);
const fs=await request("/api/files/"+fid+"/share",{token:ot,method:"POST",data:{password:""}});
check("owner document share created",fs.status===200);
check("owner document share opens",(await request("/api/public-shares/"+fs.value.token,{method:"POST",data:{}})).status===200);
for(const name of ["Sample_Title_Deed.pdf","Sample_Electrical_CoC.pdf","Homeowners_Policy_Sample.pdf"]){
 const sample=await request("/demo_docs/"+name);check("sample PDF "+name,sample.status===200&&sample.value.startsWith("%PDF-"));
}
await writeFile("/tmp/demo-test-results.json",JSON.stringify({checks,propertyId:pid,fileId:fid,jobId:jid,jobFileId:jfile.value.id,shareToken:share.value.token,templateId:template.value.id},null,2));
console.log("COMPLETE "+checks.length+" API checks");
