use crate::api::{self,Session,text,when};
use dioxus::prelude::*;
use serde_json::{Value,json};

#[component]
pub fn Maintenance(session:Session,property_id:String)->Element{
 let mut revision=use_signal(||0u32);let s=session.clone();let id=property_id.clone();
 let data=use_resource(move||{let s=s.clone();let id=id.clone();let _=revision();async move{api::get(&s,&format!("/api/properties/{id}/maintenance")).await}});
 let mut title=use_signal(String::new);let mut due=use_signal(String::new);let mut recurrence=use_signal(||"none".to_string());let mut message=use_signal(String::new);let mut busy=use_signal(||false);
 let mut service=use_signal(String::new);let mut provider=use_signal(String::new);let mut start=use_signal(String::new);
 rsx!{
  h3 {"Maintenance & appointments"}
  button {class:"secondary",onclick:move |_|revision+=1,"Refresh"}
  section {class:"card",h4 {"Create a reminder"}
   {let s=session.clone();let id=property_id.clone();rsx!{
    form {onsubmit:move |e|{e.prevent_default();let s=s.clone();let id=id.clone();async move{
     if busy(){return}busy.set(true);
     match api::post(&s,&format!("/api/properties/{id}/reminders"),json!({"title":title(),"due_at":due(),"recurrence":recurrence()})).await{
      Ok(_)=>{message.set("Reminder saved.".into());title.set(String::new());revision+=1;},Err(e)=>message.set(e)
     }busy.set(false);
    }},
     label {"Reminder" input {required:true,value:"{title}",oninput:move |e|title.set(e.value())}}
     label {"Due date and time (South Africa)" input {r#type:"datetime-local",required:true,value:"{due}",oninput:move |e|due.set(e.value())}}
     label {"Repeat" select {value:"{recurrence}",onchange:move |e|recurrence.set(e.value()),for value in ["none","daily","weekly","monthly"]{option {value:value,"{value}"}}}}
     button {r#type:"submit",disabled:busy(),"Save reminder"}
    }
   }}
  }
  match &*data.read_unchecked(){
   Some(Ok(v))=>rsx!{
    if let Some(rows)=v.get("reminders").and_then(Value::as_array){for item in rows{
     section {class:"card",h4 {"{text(item,\"title\")}"}p {"{when(item,\"due_at\")} · {text(item,\"status\")}"}
      if item["status"]=="open"{for action in ["complete","cancel"]{
       {let s=session.clone();let id=text(item,"id");let version=item["revision"].to_string();rsx!{button {class:"secondary",onclick:move |_|{
        let s=s.clone();let id=id.clone();let version=version.clone();async move{
         match api::post(&s,&format!("/api/reminders/{id}/action"),json!({"action":action,"revision":version})).await{Ok(_)=>{revision+=1;message.set("Reminder updated.".into())},Err(e)=>message.set(e)}
        }
       },"{action}"}}}
      }}
     }
    }}
    section {class:"card",h4 {"Request a service appointment"}p {class:"muted","A request becomes confirmed only when the supplier accepts it."}
     {let s=session.clone();let id=property_id.clone();rsx!{form {onsubmit:move |e|{e.prevent_default();let s=s.clone();let id=id.clone();async move{
      if busy(){return}busy.set(true);
      match api::post(&s,&format!("/api/properties/{id}/bookings"),json!({"title":service(),"supplier_org":provider(),"start_at":start(),"duration":"60"})).await{Ok(_)=>{revision+=1;message.set("Appointment requested.".into())},Err(e)=>message.set(e)}
      busy.set(false);
     }},
      label {"Service" input {required:true,value:"{service}",oninput:move |e|service.set(e.value())}}
      label {"Supplier" select {required:true,value:"{provider}",onchange:move |e|provider.set(e.value()),
       option {value:"","Choose a supplier"}
       if let Some(rows)=v.get("suppliers").and_then(Value::as_array){for item in rows{option {value:"{text(item,\"org_id\")}","{text(item,\"name\")}"}}}
      }}
      label {"Preferred time (Mon–Fri, 08:00–17:00 SAST)" input {r#type:"datetime-local",required:true,value:"{start}",oninput:move |e|start.set(e.value())}}
      button {r#type:"submit",disabled:busy(),"Request appointment"}
     }}}
    }
    if let Some(rows)=v.get("bookings").and_then(Value::as_array){for item in rows{
     section {class:"card",h4 {"{text(item,\"title\")}"}p {"{when(item,\"start_at\")} · {text(item,\"status\")}"}
      if item["status"]=="requested"||item["status"]=="confirmed"{
       {let s=session.clone();let id=text(item,"id");let version=item["revision"].to_string();rsx!{button {class:"secondary",onclick:move |_|{
        let s=s.clone();let id=id.clone();let version=version.clone();async move{
         match api::post(&s,&format!("/api/bookings/{id}/action"),json!({"action":"cancel","revision":version})).await{Ok(_)=>revision+=1,Err(e)=>message.set(e)}
        }
       },"Cancel request"}}}
      }
     }
    }}
   },
   Some(Err(e))=>rsx!{p {role:"alert","{e}"}},
   None=>rsx!{p {"Loading tasks…"}}
  }
  if !message().is_empty(){p {role:"status","{message}"}}
 }
}

#[component]
pub fn SupplierWorkspace(session:Session,onlogout:EventHandler<()>)->Element{
 let mut revision=use_signal(||0u32);let s=session.clone();
 let data=use_resource(move||{let s=s.clone();let _=revision();async move{api::get(&s,"/api/supplier").await}});
 let mut message=use_signal(String::new);
 rsx!{main {class:"mobile-shell",
  header {h1 {"Resiro"}button {onclick:move |_|onlogout.call(()),"Sign out"}}
  h2 {"Supplier dashboard"}button {class:"secondary",onclick:move |_|revision+=1,"Refresh"}
  match &*data.read_unchecked(){
   Some(Ok(v))=>rsx!{
    h3 {"{text(v,\"name\")}"}
    if let Some(rows)=v.get("bookings").and_then(Value::as_array){for item in rows{
     section {class:"card",h4 {"{text(item,\"title\")}"}p {"{text(item,\"address\")}"}p {"{when(item,\"start_at\")} · {text(item,\"status\")}"}
      for action in if item["status"]=="requested"{vec!["accept","decline"]}else if item["status"]=="confirmed"{vec!["complete","cancel"]}else{vec![]}{
       {let s=session.clone();let id=text(item,"id");let version=item["revision"].to_string();rsx!{button {class:"secondary",onclick:move |_|{
        let s=s.clone();let id=id.clone();let version=version.clone();async move{
         match api::post(&s,&format!("/api/bookings/{id}/action"),json!({"action":action,"revision":version})).await{Ok(_)=>{revision+=1;message.set("Appointment updated.".into())},Err(e)=>message.set(e)}
        }
       },"{action}"}}}
      }
     }
    }if rows.is_empty(){p {"No booking requests yet."}}}
    h3 {"Completed jobs"}
    if let Some(rows)=v.get("profile").and_then(|v|v.get("jobs")).and_then(Value::as_array){for item in rows{
     section {class:"card",p {"{text(item,\"property_address\")}"}p {"{text(item,\"description\")}"}}
    }}
   },
   Some(Err(e))=>rsx!{p {role:"alert","{e}"}},
   None=>rsx!{p {"Loading your business…"}}
  }
  if !message().is_empty(){p {role:"status","{message}"}}
 }}
}
