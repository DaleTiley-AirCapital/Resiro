use crate::{App,Result,bad,auth,property,missing};
use axum::{extract::{State,Path,Query,Form},http::{HeaderMap},response::{Html,IntoResponse,Redirect,Response},Json};
use serde_json::{Value,json};
use serde::Deserialize;
use uuid::Uuid;
use std::collections::HashMap;
pub fn e(s:&str)->String{s.replace('&',"&amp;").replace('<',"&lt;").replace('>',"&gt;").replace('"',"&quot;").replace('\'',"&#39;")}
pub fn v(data:&Value,key:&str)->String{match &data[key]{Value::String(s)=>s.clone(),Value::Null=>String::new(),other=>other.to_string()}}
pub fn enc(s:&str)->String{url::form_urlencoded::byte_serialize(s.as_bytes()).collect()}
pub fn csrf(user:&auth::User)->String{format!("<input type=hidden name=csrf value=\"{}\">",e(&user.csrf))}
pub fn input(name:&str,label:&str,value:&str,kind:&str)->String{
 let extra=if kind=="number"{" min=0 step=any"}else if kind=="email"{" autocomplete=username"}else if name=="token"{" autocomplete=one-time-code"}else if kind=="password"&&label.to_lowercase().contains("new"){" autocomplete=new-password"}else if kind=="password"{" autocomplete=current-password"}else{""};
 format!("<label>{}<input name=\"{}\" type=\"{}\" value=\"{}\"{extra}></label>",e(label),e(name),e(kind),e(value))
}
pub fn badge(value:&str)->String{format!("<span class=\"badge {}\">{}</span>",if ["failed","rejected","locked"].contains(&value){"warn"}else{""},e(value))}
pub fn layout(user:Option<&auth::User>,title:&str,body:String)->Html<String>{
 let menu=if let Some(user)=user{format!("<a href=/app>Properties</a>{}<span class=muted>{}</span><form method=post action=/logout>{}<button class=quiet>Sign out</button></form>",if user.role=="supplier"{"<a href=/supplier>Supplier console</a>"}else{""},e(&user.email),csrf(user))}else{"<a href=/>Public website</a><a href=/login>Sign in</a>".into()};
 Html(format!("<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>{} · Resiro</title><link rel=stylesheet href=/public/app.css></head><body><header class=top><a class=brand href=/app><img src=/public/logo.png alt=Resiro></a><nav>{}</nav></header><main>{}</main><footer>Resiro · Your property’s digital record</footer></body></html>",e(title),menu,body))
}
pub async fn marketing()->Result<Html<String>>{Ok(Html(tokio::fs::read_to_string("/app/marketing/index.html").await.map_err(|e|anyhow::anyhow!(e))?))}
pub async fn login()->Html<String>{layout(None,"Sign in",format!("<section class=auth><div class=eyebrow>YOUR PROPERTY, IN ONE PLACE</div><h1>Welcome home.</h1><p class=muted>Sign in to your private property workspace.</p><form method=post action=/login>{}{}<button>Sign in</button></form><details><summary>Explore the shared demo</summary><p>The demo accounts contain sample data only.</p><form method=post action=/login><input type=hidden name=email value=dale.tiley@email.com><input type=hidden name=password value=demo123><button class=quiet>Property owner demo</button></form><form method=post action=/login><input type=hidden name=email value=info@millenniumroofing.co.za><input type=hidden name=password value=supplier123><button class=quiet>Supplier demo</button></form></details><p><a href=/activate>Activate your private account</a></p></section>",input("email","Email","","email"),input("password","Password","","password")))}
#[derive(Deserialize,Default)]pub struct ActivateQuery{pub token:Option<String>}
pub async fn activate(Query(q):Query<ActivateQuery>)->Html<String>{layout(None,"Activate private account",format!("<section class=auth><h1>Your private workspace</h1><p>Choose a password. This activation code can only be used once.</p><form method=post action=/activate>{}{}<button>Activate account</button></form></section>",input("token","Activation code",q.token.as_deref().unwrap_or(""),"password"),input("password","New password (12–72 characters)","","password")))}
async fn browser(app:&App,headers:&HeaderMap)->std::result::Result<auth::User,Response>{auth::user(app,headers).await.map_err(|_|Redirect::to("/login").into_response())}
pub async fn dashboard(State(app):State<App>,headers:HeaderMap)->Result<Response>{
 let user=match browser(&app,&headers).await{Ok(u)=>u,Err(r)=>return Ok(r)};
 let records:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(p)||(SELECT jsonb_build_object('documents',count(*),'processed',count(*) FILTER(WHERE status IN ('processed','needs_review'))) FROM resiro.documents d WHERE d.property_id=p.id) FROM resiro.properties p WHERE org_id=$1 ORDER BY created_at DESC")
  .bind(user.org_id).fetch_all(&app.db).await?;
 let mut cards=String::new();
 for p in records{cards.push_str(&format!("<a class=\"card property-card\" href=\"/properties/{}\"><div class=eyebrow>PRIVATE PROPERTY FILE</div><h2>{}</h2><p>{}</p><div class=card-bottom><span>{} documents</span><span>{} processed</span></div></a>",v(&p,"id"),e(&v(&p,"name")),e(&v(&p,"address")),v(&p,"documents"),v(&p,"processed")));}
 let inbox=crate::workflows::inbox(&app,&user).await?;
 let demo=if user.email=="dale.tiley@email.com"{"<p class=notice>Shared sample account. Your personal property documents belong in your private account, never in this demo.</p>"}else{""};
 Ok(layout(Some(&user),"Your properties",format!("<section class=hero><div><div class=eyebrow>PROPERTY WORKSPACE</div><h1>Everything about your home.</h1><p>Documents, decisions, maintenance and the things that make it yours.</p></div><a class=button href=/properties/new>Add property</a></section>{demo}{inbox}<div class=grid>{cards}</div>")).into_response())
}
pub async fn new_property(State(app):State<App>,headers:HeaderMap)->Result<Response>{
 let user=match browser(&app,&headers).await{Ok(u)=>u,Err(r)=>return Ok(r)};
 Ok(layout(Some(&user),"Add property",format!("<div class=\"card narrow\"><h1>Add a property</h1><form method=post action=/properties/new>{}{}{}{}{}<button>Create private property</button></form></div>",csrf(&user),input("name","Property name","","text"),input("address","Street address","","text"),input("erf_number","Stand / ERF number","","text"),input("estate","Estate / suburb","","text"))).into_response())
}
pub async fn create_property(State(app):State<App>,headers:HeaderMap,Form(data):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,data.get("csrf").map(String::as_str).unwrap_or(""))?;
 let name=data.get("name").map(String::as_str).unwrap_or("").trim();let address=data.get("address").map(String::as_str).unwrap_or("").trim();
 if name.is_empty()||address.is_empty(){return Err(bad("Property name and address are required"));}
 let id=Uuid::new_v4();sqlx::query("INSERT INTO resiro.properties(id,org_id,name,address,data) VALUES($1,$2,$3,$4,$5)")
  .bind(id).bind(user.org_id).bind(name).bind(address).bind(json!({"erf_number":data.get("erf_number"),"estate":data.get("estate")})).execute(&app.db).await?;
 Ok(Redirect::to(&format!("/properties/{id}")))
}
#[derive(Deserialize,Default)]pub struct PageQuery{pub tab:Option<String>,pub q:Option<String>,pub category:Option<String>}
include!("property_views.rs");
include!("record_views.rs");
