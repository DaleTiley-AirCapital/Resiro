#![allow(non_snake_case)]
mod api;
mod workflows;
use api::{Session,text};
use dioxus::prelude::*;
use serde_json::{Value,json};
fn main(){dioxus::launch(App);}
fn App()->Element{
 let mut session=use_signal(||None::<Session>);
 rsx!{
  document::Style { {include_str!("../../rust/public/app.css")} }
  document::Style { {include_str!("../mobile.css")} }
  if let Some(s)=session(){
   if text(&s.user,"role")=="supplier"{workflows::SupplierWorkspace {session:s,onlogout:move |_|session.set(None)}}else{Workspace { session:s,onlogout:move |_|session.set(None) }}
  }else{ Login { onlogin:move |s|session.set(Some(s)) } }
 }
}
#[component]
fn Login(onlogin:EventHandler<Session>)->Element{
 let mut email=use_signal(String::new);let mut password=use_signal(String::new);
 let mut message=use_signal(String::new);let mut busy=use_signal(||false);
 let mut submit=move||{
  if busy(){return}busy.set(true);message.set(String::new());
  let address=email();let secret=password();
  spawn(async move{
   match api::login(address,secret).await{Ok(s)=>{password.set(String::new());onlogin.call(s)},Err(e)=>message.set(e)}
   busy.set(false);
  });
 };
 rsx!{main {class:"mobile-shell",
  h1 {"Resiro"} p {"Your home, in one place."}
  section {class:"card",
   h2 {"Sign in"}
   form {onsubmit:move |e|{e.prevent_default();submit();},
    label {"Email" input {r#type:"email",name:"email",autocomplete:"username",required:true,oninput:move|e|email.set(e.value())}}
    label {"Password" input {r#type:"password",name:"password",autocomplete:"current-password",required:true,oninput:move|e|password.set(e.value())}}
    button {r#type:"button",onclick:move |_|submit(),disabled:busy(),if busy(){"Signing in…"}else{"Sign in"}}
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
    button {class:"secondary",onclick:move |_|revision+=1,"Refresh documents"}
    form {onsubmit:move|e|{e.prevent_default();query.set(search());document.set(None);},
     input {r#type:"search",placeholder:"Search receipts, plans, certificates…",value:"{search}",oninput:move|e|search.set(e.value())}
     button {r#type:"submit","Search"}
    }
    if let Some(d)=document(){
     button {class:"secondary",onclick:move |_|document.set(None),"‹ Documents"}
     h3 {"{text(&d,\"title\")}"}p {class:"muted","{text(&d,\"name\")}"}
     if text(&d,"status")=="locked"{ ProtectedPdf {session:session.clone(),document_id:text(&d,"id"),onunlocked:move |_|{document.set(None);revision+=1;message.set("A readable copy was created. It will appear in Documents while analysis runs.".into());}} }
     if document_text().trim().is_empty(){p {class:"muted","Text is not available yet. Your original is safely stored."}}else{pre {class:"source-text","{document_text}"}}
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
   if tab()=="Tasks"{ workflows::Maintenance {session:session.clone(),property_id:text(&p,"id")} Activity {session:session.clone(),property_id:text(&p,"id")} }
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
      blockquote {p {"{text(source,\"quote\")}"}small {"Source: {text(source,\"source_name\")}"}}
     }}
    }}
   }
   nav {class:"bottom-nav",for label in ["Home","Documents","Assets","Tasks","Ask"]{
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
fn asset_field(label:&str,value:String)->Element{
 let shown=if value.trim().is_empty(){"Not recorded".to_string()}else{value};
 rsx!{div {style:"padding:8px 0;border-bottom:1px solid #edf0f5",small {class:"muted","{label}"}div {"{shown}"}}}
}
#[component]
fn Assets(session:Session,property_id:String)->Element{
 let items=use_resource(move||{let s=session.clone();let id=property_id.clone();async move{api::get(&s,&format!("/api/properties/{id}/assets")).await}});
 let mut filter=use_signal(String::new);
 rsx!{h3 {"Furniture & assets"}p {class:"muted","Purchases and proposed items stay distinguishable. Check the source before treating a candidate as something you own."}
  input {r#type:"search",aria_label:"Search assets",placeholder:"Search furniture, equipment or suppliers…",oninput:move |e|filter.set(e.value())}
  match &*items.read_unchecked(){
   Some(Ok(value))=>{
    let query=filter().to_lowercase();
    let rows=value.as_array().into_iter().flatten().filter(|item|{
     query.is_empty()||format!("{} {} {} {} {} {}",text(item,"name"),text(item,"category"),text(item,"room"),text(&item["data"],"vendor"),text(&item["data"],"make"),text(&item["data"],"model")).to_lowercase().contains(&query)
    }).collect::<Vec<_>>();
    rsx!{
     p {class:"muted","{rows.len()} matching records"}
     for item in rows.iter().take(100){
      {let data=&item["data"];let state=match text(data,"document_state").as_str(){"purchased"=>"Purchase evidence · review needed","quoted"=>"Quotation · ownership unconfirmed","proposed"=>"Proposed item",_=>"Ownership needs confirmation"};
       let total=text(data,"total_price");let unit=text(data,"unit_price");let currency=text(data,"currency");
       let price=if !total.is_empty(){format!("{currency} {total} total")}else if !unit.is_empty(){format!("{currency} {unit} per item")}else{String::new()};
       rsx!{section {class:"card",h4 {"{text(item,\"name\")}"}p {class:"muted","{text(item,\"category\")}"}p {class:"badge","{state}"}
        {asset_field("Supplier",text(data,"vendor"))}
        {asset_field("Price shown in the document",price)}
        {asset_field("Quantity",text(data,"quantity"))}
        {asset_field("Make / model",format!("{} {}",text(data,"make"),text(data,"model")).trim().to_string())}
        {asset_field("Room",text(item,"room"))}
        {asset_field("Purchase date",text(data,"purchase_date"))}
        {asset_field("Serial number",text(data,"serial_number"))}
        {asset_field("Warranty until",text(data,"warranty_until"))}
        if !text(data,"quote").is_empty(){details {summary {"Source quote"}p {class:"source-text","{text(data,\"quote\")}"}}}
       }}
      }
     }
     if rows.len()>100{p {class:"muted","Showing the first 100 matches. Search to narrow the list."}}
     if rows.is_empty(){p {"No matching assets yet. Upload a receipt or furniture invoice to start."}}
    }
   },
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

#[component]
fn ProtectedPdf(session:Session,document_id:String,onunlocked:EventHandler<()>)->Element{
 let mut password=use_signal(String::new);let mut busy=use_signal(||false);let mut message=use_signal(String::new);
 rsx!{section {class:"card",h4 {"Unlock protected PDF"}p {"The encrypted original is preserved. Your document password is used privately and is not retained."}
  form {onsubmit:move |e|{e.prevent_default();let s=session.clone();let id=document_id.clone();async move{
   if busy(){return}busy.set(true);let secret=password();password.set(String::new());
   match api::post(&s,&format!("/api/documents/{id}/unlock"),json!({"password":secret})).await{Ok(_)=>onunlocked.call(()),Err(e)=>message.set(e)}
   busy.set(false);
  }},
   input {r#type:"password",autocomplete:"off",required:true,value:"{password}",oninput:move |e|password.set(e.value()),placeholder:"Document password"}
   button {r#type:"submit",disabled:busy(),if busy(){"Unlocking…"}else{"Unlock privately"}}
  }
  if !message().is_empty(){p {role:"alert","{message}"}}
 }}
}
