#![allow(non_snake_case)]
mod api;
use api::{Session,text};
use dioxus::prelude::*;
use serde_json::{Value,json};
fn main(){dioxus::launch(App);}
fn App()->Element{
 let mut session=use_signal(||None::<Session>);
 rsx!{
  document::Style { {include_str!("../../rust/public/app.css")} }
  document::Style { "body{padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);background:#f5f7fb}.mobile-shell{max-width:860px;margin:auto;padding:20px 16px 100px}.bottom-nav{position:fixed;bottom:0;left:0;right:0;display:flex;justify-content:space-around;padding:10px 4px calc(10px + env(safe-area-inset-bottom));background:white;border-top:1px solid #dce3ec;z-index:20}.bottom-nav button{background:none;color:#253858;font-size:13px;padding:10px;min-height:48px}.bottom-nav button.active{color:#175cd3;background:#edf4ff}.doc-card{display:block;width:100%;text-align:left;margin:10px 0;background:white;color:#253858;border:1px solid #dce3ec;border-radius:16px;padding:18px}.doc-card small{display:block;margin-top:8px}.source-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.7}input[type=file]{max-width:100%}" }
  if let Some(s)=session(){
   Workspace { session:s,onlogout:move |_|session.set(None) }
  }else{ Login { onlogin:move |s|session.set(Some(s)) } }
 }
}
#[component]
fn Login(onlogin:EventHandler<Session>)->Element{
 let mut email=use_signal(String::new);let mut password=use_signal(String::new);
 let mut message=use_signal(String::new);let mut busy=use_signal(||false);
 rsx!{main {class:"mobile-shell",
  h1 {"Resiro"} p {"Your home, in one place."}
  section {class:"card",
   h2 {"Sign in"}
   form { onsubmit:move |e|{e.prevent_default();async move{
    if busy(){return}busy.set(true);message.set(String::new());
    match api::login(email(),password()).await{Ok(s)=>{password.set(String::new());onlogin.call(s)},Err(e)=>message.set(e)}
    busy.set(false);
   }},
    label {"Email" input {r#type:"email",autocomplete:"username",value:"{email}",required:true,oninput:move|e|email.set(e.value())}}
    label {"Password" input {r#type:"password",autocomplete:"current-password",value:"{password}",required:true,oninput:move|e|password.set(e.value())}}
    button {r#type:"submit",disabled:busy(),if busy(){"Signing in…"}else{"Sign in"}}
   }
   if !message().is_empty(){p {role:"alert","{message}"}}
   p {class:"muted","Use your private account for personal documents. Shared demo accounts show demonstration properties only."}
  }
 }}
}
#[component]
fn Workspace(session:Session,onlogout:EventHandler<()>)->Element{
 let mut property=use_signal(||None::<Value>);let mut tab=use_signal(||"Home".to_string());let mut revision=use_signal(||0u32);
 let session_for_fetch=session.clone();
 let properties=use_resource(move||{let s=session_for_fetch.clone();let _=revision();async move{api::get(&s,"/api/properties").await}});
 let mut search=use_signal(String::new);let mut query=use_signal(String::new);
 let session_for_docs=session.clone();
 let documents=use_resource(move||{let s=session_for_docs.clone();let p=property();let q=query();let _=revision();async move{
  if let Some(p)=p{let id=text(&p,"id");let suffix: String=url::form_urlencoded::Serializer::new(String::new()).append_pair("q",&q).finish();api::get(&s,&if q.trim().is_empty(){format!("/api/properties/{id}/documents")}else{format!("/api/properties/{id}/search?{suffix}")}).await}else{Ok(json!([]))}
 }});
 let mut document=use_signal(||None::<Value>);let mut document_text=use_signal(String::new);
 let mut message=use_signal(String::new);let mut busy=use_signal(||false);
 let mut question=use_signal(String::new);let mut answer=use_signal(||None::<Value>);
 let name=text(&session.user,"name");
 rsx!{main {class:"mobile-shell",
  header {div {h1 {"Resiro"}p {class:"muted","{name}"}} button {onclick:move |_|onlogout.call(()),"Sign out"}}
  if let Some(p)=property(){
   {let s=session.clone();let upload_property=text(&p,"id");rsx!{button {class:"secondary",onclick:move |_|{property.set(None);document.set(None);answer.set(None);},"‹ My properties"}
    h2 {"{text(&p,\"name\")}"}p {class:"muted","{text(&p,\"address\")}"}
    if tab()=="Home"{
     section {class:"card",h3 {"Property file"}p {"Documents, purchases and maintenance belong to this home."}
      for (label,key) in [("Bedrooms","bedrooms"),("Bathrooms","bathrooms"),("Toilets","toilets"),("Floor area","floor_area"),("Land area","land_area")]{
       p {strong {"{label}: "} "{p.get(\"data\").and_then(|v|v.get(key)).map(|v|v.as_str().map(str::to_string).unwrap_or_else(||v.to_string())).filter(|v|!v.is_empty()).unwrap_or_else(||\"Not yet confirmed\".into())}"}
      }
     }
     section {class:"card",h3 {"Capture something"}p {"Add an invoice, receipt, photograph or certificate. Resiro reads it and keeps the source with the extracted details."}
      input {r#type:"file",multiple:true,accept:".pdf,.jpg,.jpeg,.png,.xlsx,.docx,.eml,.msg,.zip",onchange:move |evt|{
       let s=s.clone();let id=upload_property.clone();async move{
        if busy(){return}busy.set(true);message.set("Uploading…".into());
        let mut uploaded=0;let mut errors=Vec::new();
        for file in evt.files(){let filename=file.name();match file.read_bytes().await{
         Ok(bytes)=>{if bytes.len()>100*1024*1024{errors.push("A file exceeds 100 MB.".to_string());continue}
          match api::upload(&s,&id,filename,bytes.to_vec()).await{Ok(_)=>uploaded+=1,Err(e)=>errors.push(e)}},
         Err(_)=>errors.push("Unable to read a selected file.".into())
        }}
        message.set(format!("{uploaded} document(s) uploaded. {}",errors.join(" ")));revision+=1;busy.set(false);
       }
      }}
     }
    }
   }}
   if tab()=="Documents"{
    form {onsubmit:move|e|{e.prevent_default();query.set(search());document.set(None);},
     input {r#type:"search",placeholder:"Search receipts, plans, certificates…",value:"{search}",oninput:move|e|search.set(e.value())}
     button {r#type:"submit","Search"}
    }
    if let Some(d)=document(){
     button {class:"secondary",onclick:move |_|document.set(None),"‹ Documents"}
     h3 {"{text(&d,\"title\")}"}p {class:"muted","{text(&d,\"name\")}"}
     pre {class:"source-text","{document_text}"}
    }else{
     match &*documents.read_unchecked(){
      Some(Ok(value))=>rsx!{
       if let Some(rows)=value.as_array(){for d in rows.iter().cloned(){
        {let s=session.clone();let item=d.clone();rsx!{button {class:"doc-card",onclick:move |_|{
         let s=s.clone();let item=item.clone();async move{
          document.set(Some(item.clone()));document_text.set("Loading source text…".into());
          match api::get(&s,&format!("/api/documents/{}/text",text(&item,"id"))).await{
           Ok(v)=>document_text.set(text(&v,"extracted_text")),Err(e)=>document_text.set(e)
          }
         }
        },strong {"{text(&d,\"title\")}"}small {"{text(&d,\"category\")} · {text(&d,\"status\")}"}small {"{text(&d,\"name\")}"}}}}
       }if rows.is_empty(){p {"No matching documents."}}}
      },
      Some(Err(e))=>rsx!{p {role:"alert","{e}"}},
      None=>rsx!{p {"Loading documents…"}}
     }
    }
   }
   if tab()=="Assets"{ Assets {session:session.clone(),property_id:text(&p,"id")} }
   if tab()=="Activity"{ Activity {session:session.clone(),property_id:text(&p,"id")} }
   if tab()=="Ask"{
    section {class:"card",h3 {"Ask about your home"}p {"Answers use your documents. Check the source when a value needs confirmation."}
     textarea {placeholder:"What bed did I buy, where, and how much did it cost?",value:"{question}",oninput:move|e|question.set(e.value())}
     {let s=session.clone();let id=text(&p,"id");rsx!{button {disabled:busy()||question().trim().is_empty(),onclick:move |_|{let s=s.clone();let id=id.clone();async move{
      busy.set(true);message.set(String::new());
      match api::post(&s,&format!("/api/properties/{id}/ask"),json!({"question":question()})).await{Ok(v)=>answer.set(Some(v)),Err(e)=>message.set(e)}
      busy.set(false);
     }},if busy(){"Reading your property file…"}else{"Ask Resiro"}}}}
    }
    if let Some(a)=answer(){section {class:"card",
     p {"{text(&a,\"answer\")}"}p {class:"muted","Evidence confidence: {text(&a,\"confidence\")}"}
     if let Some(sources)=a.get("citations").and_then(Value::as_array){for source in sources{
      blockquote {p {"{text(source,\"quote\")}"}small {"Document: {text(source,\"document_id\")}"}}
     }}
    }}
   }
   nav {class:"bottom-nav",for label in ["Home","Documents","Assets","Activity","Ask"]{
    button {class:if tab()==label{"active"}else{""},onclick:move |_|{tab.set(label.to_string());document.set(None);},"{label}"}
   }}
  }else{
   h2 {"My properties"}
   match &*properties.read_unchecked(){
    Some(Ok(value))=>rsx!{
     if let Some(rows)=value.as_array(){for p in rows.iter().cloned(){
      {let item=p.clone();rsx!{button {class:"doc-card",onclick:move |_|property.set(Some(item.clone())),
       strong {"{text(&p,\"name\")}"}small {"{text(&p,\"address\")}"}
      }}}}
      if rows.is_empty(){p {"No properties are linked to this account yet."}}
     }
    },
    Some(Err(e))=>rsx!{p {role:"alert","{e}"}},
    None=>rsx!{p {"Loading your properties…"}}
   }
  }
  if !message().is_empty(){p {role:"status","{message}"}}
 }}
}
#[component]
fn Assets(session:Session,property_id:String)->Element{
 let items=use_resource(move||{let s=session.clone();let id=property_id.clone();async move{api::get(&s,&format!("/api/properties/{id}/assets")).await}});
 rsx!{h3 {"Furniture & assets"}p {class:"muted","Purchases and proposed items stay distinguishable. Source documents provide the evidence."}
  match &*items.read_unchecked(){
   Some(Ok(value))=>rsx!{if let Some(rows)=value.as_array(){for item in rows{
    section {class:"card",h4 {"{text(item,\"name\")}"}p {"{text(item,\"room\")} · {text(item,\"category\")}"}
     pre {class:"source-text","{serde_json::to_string_pretty(item.get(\"data\").unwrap_or(&Value::Null)).unwrap_or_default()}"}
     p {class:"muted","Review: {text(item,\"review_status\")}"}
    }
   }if rows.is_empty(){p {"No assets have been identified yet. Upload a receipt or furniture invoice to start."}}}},
   Some(Err(e))=>rsx!{p {role:"alert","{e}"}},
   None=>rsx!{p {"Loading assets…"}}
  }
 }
}
#[component]
fn Activity(session:Session,property_id:String)->Element{
 let items=use_resource(move||{let s=session.clone();let id=property_id.clone();async move{api::get(&s,&format!("/api/properties/{id}/activity")).await}});
 rsx!{h3 {"Property activity"}
  match &*items.read_unchecked(){
   Some(Ok(value))=>rsx!{if let Some(rows)=value.as_array(){for item in rows{section {class:"card",
    strong {"{text(item,\"title\")}"}p {"{text(item,\"description\")}"}small {"{text(item,\"created_at\")}"}
   }}if rows.is_empty(){p {"New property activity will appear here."}}}},
   Some(Err(e))=>rsx!{p {role:"alert","{e}"}},
   None=>rsx!{p {"Loading activity…"}}
  }
 }
}
