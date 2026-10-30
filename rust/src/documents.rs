use crate::{App,Result,Error,bad,auth,property,missing,storage};
use axum::{extract::{State,Path,Query,Multipart,Form},http::{HeaderMap,header},response::{IntoResponse,Redirect,Response},Json};
use serde_json::{Value,json};
use serde::Deserialize;
use uuid::Uuid;
use std::collections::HashMap;

pub fn category(path:&str)->String {
 let p=path.to_lowercase();
 let rules=[
  ("Finance & Bond",vec!["bond","payslip","home loan","income","bank","pre-approval","pre approval"]),
  ("Ownership & Legal",vec!["deed","transfer","title","ownership"]),
  ("Insurance",vec!["insurance","policy","santam","old mutual"]),
  ("Energy & Solar",vec!["solar","inverter","battery","electricity"]),
  ("Water & Borehole",vec!["borehole","filtration","water tank","tank stand"]),
  ("Furniture & Contents",vec!["furniture","dinning","dining","table","bed","desk","firewood rack","golf hitting"]),
  ("Plans & Approvals",vec!["plan","architect","approval","occupancy","certificate","coc","roof design"]),
  ("Fixtures & Finishes",vec!["fireplace","fire place","skirting","deck","kitchen","tiles"]),
  ("Maintenance",vec!["maintenance","repair invoice","service invoice","pest control"]),
  ("Construction & Quotes",vec!["building cost","construction","quote","additions","material"]),
 ];
 for (category,terms) in rules {if terms.iter().any(|s|p.contains(s)){return category.into();}}
 if p.ends_with(".msg")||p.ends_with(".eml"){return "Correspondence".into();}
 if [".jpg",".jpeg",".png"].iter().any(|e|p.ends_with(e)){return "Photos".into();}
 "Other".into()
}
pub fn mime(name:&str)->&'static str{
 match name.rsplit('.').next().unwrap_or("").to_lowercase().as_str(){
 "pdf"=>"application/pdf","png"=>"image/png","jpg"|"jpeg"=>"image/jpeg",
 "xlsx"=>"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
 "docx"=>"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
 "zip"=>"application/zip","eml"=>"message/rfc822","msg"=>"application/vnd.ms-outlook",_=>"application/octet-stream"
 }
}
pub async fn store_one(app:&App,user:&auth::User,pid:Uuid,name:&str,bytes:Vec<u8>,root:&str,path:&str,parent:Option<Uuid>,modified:&str,source_hash:&str)->Result<(Uuid,bool)>{
 property(app,user,pid).await?;
 if storage::excluded(name){return Err(bad("CAD/design source files are excluded from this property vault"));}
 if bytes.is_empty()||bytes.len()>100*1024*1024{return Err(bad("Files must contain data and be smaller than 100 MB"));}
 let hash=storage::hash(&bytes);
 let mut tx=app.db.begin().await?;
 sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))").bind(pid.to_string()+&hash).execute(&mut *tx).await?;
 let exists:Option<Uuid>=sqlx::query_scalar("SELECT id FROM resiro.documents WHERE property_id=$1 AND org_id=$2 AND sha256=$3")
  .bind(pid).bind(user.org_id).bind(&hash).fetch_optional(&mut *tx).await?;
 let id=exists.unwrap_or_else(Uuid::new_v4);
 if exists.is_none(){
  let key=format!("{}/{}/{hash}",user.org_id,pid);let size=bytes.len() as i64;
  app.store.put(&app.http,&key,bytes).await?;
  sqlx::query("INSERT INTO resiro.documents(id,property_id,org_id,name,title,category,sha256,bytes,mime,bucket,object_key) VALUES($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10)")
   .bind(id).bind(pid).bind(user.org_id).bind(name).bind(category(&format!("{root}/{path}/{name}"))).bind(&hash).bind(size)
   .bind(mime(name)).bind(app.store.bucket.name()).bind(key).execute(&mut *tx).await?;
 }
 sqlx::query("INSERT INTO resiro.document_sources(id,document_id,source_root,source_path,parent_id,modified_at,source_sha256) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(document_id,source_root,source_path) DO NOTHING")
  .bind(Uuid::new_v4()).bind(id).bind(root).bind(path).bind(parent).bind(modified).bind(source_hash).execute(&mut *tx).await?;
 tx.commit().await?;if exists.is_none(){crate::event(app,user,Some(pid),"document","Document uploaded",json!({"document_id":id,"name":name,"category":category(&format!("{root}/{path}/{name}"))})).await?;}Ok((id,exists.is_some()))
}
pub async fn upload(State(app):State<App>,headers:HeaderMap,mut multipart:Multipart)->Result<Response>{
 let user=auth::user(&app,&headers).await?;
 let mut fields=HashMap::new();let mut files=Vec::new();
 while let Some(field)=multipart.next_field().await.map_err(|_|bad("Unreadable upload form"))?{
  let key=field.name().unwrap_or("").to_owned();
  if let Some(name)=field.file_name(){
   let name=name.replace('\\',"/").rsplit('/').next().unwrap_or("document").chars().filter(|c|!c.is_control()).take(240).collect::<String>();
   if storage::excluded(&name){return Err(bad("This drawing/design file type is excluded"));}
   let bytes=field.bytes().await.map_err(|_|bad("File exceeds upload limits"))?.to_vec();if !name.is_empty()&&!bytes.is_empty(){files.push((name,bytes));}
  }else{let value=field.text().await.map_err(|_|bad("Invalid upload metadata"))?;if value.len()>4096{return Err(bad("Upload metadata is too long"));}fields.insert(key,value);}
 }
 auth::api_csrf(&app,&user,&headers,fields.get("csrf").map(String::as_str))?;
 let pid:Uuid=fields.get("property_id").ok_or_else(||bad("Property required"))?.parse().map_err(|_|bad("Invalid property"))?;
 property(&app,&user,pid).await?;
 let mut results=Vec::new();
 for (name,bytes) in files{
  let original_hash=storage::hash(&bytes);
  if let Some(expected)=fields.get("expected_sha256"){if &original_hash!=expected{return Err(bad("The uploaded file checksum did not match the source"));}}
  let root=fields.get("source_root").map(String::as_str).unwrap_or("Uploaded");
  let path=fields.get("source_path").map(String::as_str).unwrap_or(&name);
  let modified=fields.get("modified_at").map(String::as_str).unwrap_or("");
  // Do not persist native drawings hidden in containers. Preserve safe mail content and attachments.
  if name.to_lowercase().ends_with(".msg"){
   let parsed=crate::worker::msg_parts(&bytes).map_err(Error::Other)?;
   if parsed.1.iter().any(|(n,_)|storage::excluded(n)){
    let safe_name=format!("{name}.txt");let safe_text=parsed.0.into_bytes();
    let (id,duplicate)=store_one(&app,&user,pid,&safe_name,safe_text,root,path,None,modified,&original_hash).await?;
    let mut excluded=0;
    for (attachment,body) in parsed.1{if storage::excluded(&attachment){excluded+=1;continue;}store_one(&app,&user,pid,&attachment,body,root,&format!("{path}!{attachment}"),Some(id),modified,&original_hash).await?;}
    results.push(json!({"id":id,"duplicate":duplicate,"sanitized":true,"excluded_attachments":excluded,"source_sha256":original_hash}));continue;
   }
  }
  if name.to_lowercase().ends_with(".zip"){
   let members=crate::worker::zip_parts(&bytes).map_err(Error::Other)?;
   if members.iter().any(|(n,_)|storage::excluded(n)){
    let safe_name=format!("{name}.index.txt");let summary=members.iter().filter(|(n,_)|!storage::excluded(n)).map(|(n,_)|n.as_str()).collect::<Vec<_>>().join("\n");
    let (id,duplicate)=store_one(&app,&user,pid,&safe_name,summary.into_bytes(),root,path,None,modified,&original_hash).await?;
    let mut excluded=0;
    for (member,body) in members{if storage::excluded(&member){excluded+=1;continue;}let file_name=member.rsplit('/').next().unwrap_or(&member);store_one(&app,&user,pid,file_name,body,root,&format!("{path}!{member}"),Some(id),modified,&original_hash).await?;}
    results.push(json!({"id":id,"duplicate":duplicate,"sanitized":true,"excluded_attachments":excluded,"source_sha256":original_hash}));continue;
   }
  }
  let (id,duplicate)=store_one(&app,&user,pid,&name,bytes,root,path,None,modified,&original_hash).await?;
  results.push(json!({"id":id,"duplicate":duplicate,"source_sha256":original_hash}));
 }
 if results.is_empty(){return Err(bad("Choose at least one document"));}
 if fields.get("redirect").is_some(){Ok(Redirect::to(&format!("/properties/{pid}?tab=documents")).into_response())}else{Ok(Json(json!({"documents":results})).into_response())}
}
pub async fn list(State(app):State<App>,headers:HeaderMap,Path(pid):Path<Uuid>)->Result<Json<Value>>{
 let user=auth::user(&app,&headers).await?;property(&app,&user,pid).await?;
 let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(d)-'object_key'-'bucket'-'extracted_text'-'extraction' FROM resiro.documents d WHERE property_id=$1 AND org_id=$2 ORDER BY category,name")
  .bind(pid).bind(user.org_id).fetch_all(&app.db).await?;Ok(Json(json!(rows)))
}
pub async fn facts(State(app):State<App>,headers:HeaderMap,Path(pid):Path<Uuid>)->Result<Json<Value>>{
 let user=auth::user(&app,&headers).await?;property(&app,&user,pid).await?;
 let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(f) FROM resiro.facts f WHERE property_id=$1 AND org_id=$2 ORDER BY fact_key,created_at")
  .bind(pid).bind(user.org_id).fetch_all(&app.db).await?;Ok(Json(json!(rows)))
}
#[derive(Deserialize)]pub struct Search{pub q:Option<String>}
pub async fn search(State(app):State<App>,headers:HeaderMap,Path(pid):Path<Uuid>,Query(input):Query<Search>)->Result<Json<Value>>{
 let user=auth::user(&app,&headers).await?;property(&app,&user,pid).await?;
 Ok(Json(json!(search_rows(&app,&user,pid,input.q.as_deref().unwrap_or("")).await?)))
}
pub async fn search_rows(app:&App,user:&auth::User,pid:Uuid,q:&str)->Result<Vec<Value>>{
 let q=q.chars().take(300).collect::<String>();if q.trim().is_empty(){return Ok(Vec::new());}
 Ok(sqlx::query_scalar("SELECT jsonb_build_object('id',id,'name',name,'title',title,'category',category,'status',status,'excerpt',left(extracted_text,1800),'rank',ts_rank(to_tsvector('english',name||' '||extracted_text),websearch_to_tsquery('english',$3))) FROM resiro.documents WHERE property_id=$1 AND org_id=$2 AND (to_tsvector('english',name||' '||extracted_text) @@ websearch_to_tsquery('english',$3) OR name ILIKE '%'||$3||'%') ORDER BY ts_rank(to_tsvector('english',name||' '||extracted_text),websearch_to_tsquery('english',$3)) DESC LIMIT 20")
  .bind(pid).bind(user.org_id).bind(q).fetch_all(&app.db).await?)
}
pub async fn download(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>)->Result<Response>{
 let user=auth::user(&app,&headers).await?;
 let row:Option<(String,String,String)>=sqlx::query_as("SELECT object_key,name,sha256 FROM resiro.documents WHERE id=$1 AND org_id=$2")
  .bind(id).bind(user.org_id).fetch_optional(&app.db).await?;
 let (key,name,sha)=row.ok_or_else(missing)?;let bytes=app.store.get(&app.http,&key).await?;
 if storage::hash(&bytes)!=sha{return Err(Error::Other(anyhow::anyhow!("Stored file checksum mismatch")));}
 let filename=name.replace(['"','\r','\n'],"_");
 Ok(([(header::CONTENT_TYPE,"application/octet-stream".to_string()),(header::CONTENT_DISPOSITION,format!("attachment; filename*=UTF-8''{}",url::form_urlencoded::byte_serialize(filename.as_bytes()).collect::<String>())),(header::CACHE_CONTROL,"no-store".into()),(header::HeaderName::from_static("x-content-type-options"),"nosniff".into())],bytes).into_response())
}
pub async fn create_house(State(app):State<App>,headers:HeaderMap,Json(input):Json<Value>)->Result<Json<Value>>{
 if !auth::import_ok(&app,&headers){return Err(missing());}let user=auth::user(&app,&headers).await?;
 let name=input["name"].as_str().unwrap_or("Private property");let address=input["address"].as_str().unwrap_or("");
 let existing:Option<Uuid>=sqlx::query_scalar("SELECT id FROM resiro.properties WHERE org_id=$1 AND address=$2").bind(user.org_id).bind(address).fetch_optional(&app.db).await?;
 let id=existing.unwrap_or_else(Uuid::new_v4);
 sqlx::query("INSERT INTO resiro.properties(id,org_id,name,address,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING")
  .bind(id).bind(user.org_id).bind(name).bind(address).bind(input.get("data").cloned().unwrap_or(json!({}))).execute(&app.db).await?;
 Ok(Json(json!({"id":id,"owner":user.email,"visibility":"private"})))
}
pub async fn save_manifest(State(app):State<App>,headers:HeaderMap,Json(input):Json<Value>)->Result<Json<Value>>{
 if !auth::import_ok(&app,&headers){return Err(missing());}let user=auth::user(&app,&headers).await?;
 let pid:Uuid=input["property_id"].as_str().ok_or_else(||bad("Property required"))?.parse().map_err(|_|bad("Invalid property"))?;
 property(&app,&user,pid).await?;
 sqlx::query("INSERT INTO resiro.imports(id,property_id,org_id,manifest) VALUES($1,$2,$3,$4)").bind(Uuid::new_v4()).bind(pid).bind(user.org_id).bind(input).execute(&app.db).await?;
 Ok(Json(json!({"saved":true})))
}
pub async fn edit_form(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,Form(input):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,input.get("csrf").map(String::as_str).unwrap_or(""))?;
 let title=input.get("title").map(String::as_str).unwrap_or("").trim();let category=input.get("category").map(String::as_str).unwrap_or("Other");
 if title.is_empty()||title.len()>500||category.len()>100{return Err(bad("Choose a valid title and category"));}
 let affected=sqlx::query("UPDATE resiro.documents SET title=$1,category=$2,extraction=extraction||jsonb_build_object('filing_reviewed',true) WHERE id=$3 AND org_id=$4")
  .bind(title).bind(category).bind(id).bind(user.org_id).execute(&app.db).await?;
 if affected.rows_affected()==0{return Err(missing());}Ok(Redirect::to(&format!("/documents/{id}")))
}
pub async fn retry(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,Form(input):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,input.get("csrf").map(String::as_str).unwrap_or(""))?;
 let changed=sqlx::query("UPDATE resiro.documents SET status='queued',error=NULL,claimed_at=NULL,attempts=0,next_attempt_at=now() WHERE id=$1 AND org_id=$2 AND status NOT IN ('reading','analyzing')")
  .bind(id).bind(user.org_id).execute(&app.db).await?;
 if changed.rows_affected()==0{return Err(bad("This document is being processed or was not found"));}Ok(Redirect::to(&format!("/documents/{id}")))
}
pub async fn review_fact(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,Form(input):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,input.get("csrf").map(String::as_str).unwrap_or(""))?;
 let status=input.get("status").map(String::as_str).unwrap_or("");if !["confirmed","rejected"].contains(&status){return Err(bad("Choose a review result"));}
 let pid:Option<Uuid>=sqlx::query_scalar("UPDATE resiro.facts SET review_status=$1 WHERE id=$2 AND org_id=$3 RETURNING property_id")
  .bind(status).bind(id).bind(user.org_id).fetch_optional(&app.db).await?;
 Ok(Redirect::to(&format!("/properties/{}?tab=overview",pid.ok_or_else(missing)?)))
}
#[cfg(test)]mod tests{use super::*;#[test]fn classify(){assert_eq!(category("Furniture/Bed receipt.pdf"),"Furniture & Contents");assert_eq!(category("Bank Documents/Bond.pdf"),"Finance & Bond");}}

pub async fn text_json(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>)->Result<Json<Value>>{
 let user=auth::user(&app,&headers).await?;
 let row:Option<Value>=sqlx::query_scalar("SELECT jsonb_build_object('id',id,'name',name,'title',title,'category',category,'status',status,'extracted_text',extracted_text) FROM resiro.documents WHERE id=$1 AND org_id=$2")
 .bind(id).bind(user.org_id).fetch_optional(&app.db).await?;
 Ok(Json(row.ok_or_else(missing)?))
}

include!("document_unlock.rs");
