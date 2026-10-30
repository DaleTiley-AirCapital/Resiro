use crate::{App,Result,Error,auth,documents};
use serde_json::{Value,json};
use uuid::Uuid;
use std::{io::{Read,Cursor},path::{Path,PathBuf}};
use calamine::Reader;

pub fn zip_parts(bytes:&[u8])->anyhow::Result<Vec<(String,Vec<u8>)>>{
 let mut archive=zip::ZipArchive::new(Cursor::new(bytes))?;let mut parts=Vec::new();let mut total=0u64;
 if archive.len()>1000{anyhow::bail!("Archive contains too many entries");}
 for i in 0..archive.len(){let mut entry=archive.by_index(i)?;if entry.is_dir(){continue;}
  let name=entry.name().replace('\\',"/");if name.split('/').any(|p|p=="..")||name.starts_with('/'){anyhow::bail!("Unsafe archive member path");}
  total+=entry.size();if entry.size()>100*1024*1024||total>300*1024*1024{anyhow::bail!("Archive expands beyond processing limits");}
  let mut data=Vec::new();entry.read_to_end(&mut data)?;parts.push((name,data));
 }Ok(parts)
}
fn unicode(bytes:&[u8])->String{String::from_utf16_lossy(&bytes.chunks_exact(2).map(|b|u16::from_le_bytes([b[0],b[1]])).collect::<Vec<_>>()).trim_matches('\0').to_owned()}
pub fn msg_parts(bytes:&[u8])->anyhow::Result<(String,Vec<(String,Vec<u8>)>)>{
 let mut compound=cfb::CompoundFile::open(Cursor::new(bytes))?;
 let paths:Vec<PathBuf>=compound.walk().filter(|e|e.is_stream()).map(|e|e.path().to_path_buf()).collect();
 let mut text=String::new();let mut attachments=std::collections::BTreeMap::<String,(String,Vec<u8>)>::new();
 for path in paths{
  let filename=path.file_name().and_then(|p|p.to_str()).unwrap_or("").to_uppercase();let mut data=Vec::new();compound.open_stream(&path)?.take(100*1024*1024).read_to_end(&mut data)?;
  let parent=path.parent().unwrap_or(Path::new("/")).to_string_lossy().to_string();
  if parent.to_lowercase().contains("__attach_version1.0_"){
   let entry=attachments.entry(parent).or_insert(("attachment.bin".into(),Vec::new()));
   if filename.starts_with("__SUBSTG1.0_3707")||filename.starts_with("__SUBSTG1.0_3704"){
    entry.0=if filename.ends_with("001F"){unicode(&data)}else{String::from_utf8_lossy(&data).trim_matches('\0').to_string()};
   }else if filename=="__SUBSTG1.0_37010102"{entry.1=data;}
  }else if ["__SUBSTG1.0_0037001F","__SUBSTG1.0_0C1A001F","__SUBSTG1.0_0C1F001F","__SUBSTG1.0_0E04001F","__SUBSTG1.0_1000001F"].contains(&filename.as_str()){
   text.push_str(&unicode(&data));text.push_str("\n\n");
  }else if filename=="__SUBSTG1.0_1000001E"{text.push_str(&String::from_utf8_lossy(&data));}
 }
 Ok((text,attachments.into_values().filter(|(_,b)|!b.is_empty()).collect()))
}
fn strip_xml(s:&str)->String{
 let text=regex::Regex::new("<[^>]+>").unwrap().replace_all(s," ");
 quick_xml::escape::unescape(&text).map(|v|v.into_owned()).unwrap_or_else(|_|text.into_owned())
}
async fn tool(program:&str,args:&[String],seconds:u64)->anyhow::Result<String>{
 let mut command=tokio::process::Command::new(program);command.args(args).kill_on_drop(true);
 let result=tokio::time::timeout(std::time::Duration::from_secs(seconds),command.output()).await??;
 if !result.status.success(){anyhow::bail!("Document conversion tool failed");}
 Ok(String::from_utf8_lossy(&result.stdout).into_owned())
}
pub struct Extracted{pub text:String,pub attachments:Vec<(String,Vec<u8>)>,pub method:String,pub limitations:Vec<String>}
pub async fn extract(name:&str,bytes:&[u8])->anyhow::Result<Extracted>{
 let ext=name.rsplit('.').next().unwrap_or("").to_lowercase();
 let mut result=Extracted{text:String::new(),attachments:Vec::new(),method:ext.clone(),limitations:Vec::new()};
 match ext.as_str(){
  "txt"|"md"|"csv"|"json"|"xml" => result.text=String::from_utf8_lossy(bytes).into_owned(),
  "msg" => {let (text,parts)=msg_parts(bytes)?;result.text=text;result.attachments=parts;if result.text.trim().is_empty(){result.limitations.push("Message body could not be read; attachments are retained separately.".into());}},
  "eml" => {
   let mail=mailparse::parse_mail(bytes)?;
   fn walk(mail:&mailparse::ParsedMail<'_>,result:&mut Extracted)->anyhow::Result<()>{
    use mailparse::MailHeaderMap;
    if result.text.is_empty(){for field in ["Subject","From","To","Date"]{if let Some(v)=mail.headers.get_first_value(field){result.text.push_str(&format!("{field}: {v}\n"));}}}
    let disposition=mail.get_content_disposition();
    if let Some(name)=disposition.params.get("filename"){result.attachments.push((name.to_string(),mail.get_body_raw()?));}
    else if mail.subparts.is_empty()&&mail.ctype.mimetype.starts_with("text/"){result.text.push_str(&strip_xml(&mail.get_body()?));}
    for part in &mail.subparts{walk(part,result)?;}Ok(())
   }walk(&mail,&mut result)?;
  },
  "zip"=>{result.attachments=zip_parts(bytes)?;result.text=format!("Archive contents:\n{}",result.attachments.iter().map(|(n,_)|n.as_str()).collect::<Vec<_>>().join("\n"));},
  "docx"=>{
   for (part,body) in zip_parts(bytes)?{if part.starts_with("word/")&&part.ends_with(".xml")&&!part.contains("_rels"){
    result.text.push_str(&format!("\n[{part}]\n{}\n",strip_xml(&String::from_utf8_lossy(&body))));
   }}
  },
  "xlsx"|"xls"=>{
   let mut book=calamine::open_workbook_auto_from_rs(Cursor::new(bytes.to_vec()))?;
   for sheet in book.sheet_names().to_owned(){result.text.push_str(&format!("\nWorksheet: {sheet}\n"));
    if let Ok(range)=book.worksheet_range(&sheet){for (i,row) in range.rows().enumerate(){
     let values=row.iter().map(ToString::to_string).collect::<Vec<_>>();if values.iter().any(|v|!v.trim().is_empty()){result.text.push_str(&format!("Row {}: {}\n",i+1,values.join(" | ")));}
    }}
   }
  },
  "pdf"|"png"|"jpg"|"jpeg"=>{
   let directory=tempfile::tempdir()?;let input=directory.path().join(format!("input.{ext}"));tokio::fs::write(&input,bytes).await?;
   let path=input.to_string_lossy().to_string();
   if ext=="pdf"{
    result.text=tool("pdftotext",&["-layout".into(),"-enc".into(),"UTF-8".into(),path.clone(),"-".into()],90).await?;
    let mut pages=result.text.split('\x0c').map(ToString::to_string).collect::<Vec<_>>();
    let count=pages.len().saturating_sub(1).max(1);
    let mut limited=false;
    for (i,page) in pages.iter_mut().enumerate().take(count){
     if page.chars().filter(|c|c.is_alphanumeric()).count()>=50{continue;}
     if i>=100{limited=true;continue;}
     let output=directory.path().join(format!("page-{}",i+1)).to_string_lossy().to_string();
     tool("pdftoppm",&["-f".into(),(i+1).to_string(),"-l".into(),(i+1).to_string(),"-scale-to".into(),"2400".into(),"-singlefile".into(),"-png".into(),path.clone(),output.clone()],90).await?;
     match tool("tesseract",&[format!("{output}.png"),"stdout".into(),"-l".into(),"eng+afr".into()],90).await{Ok(text)=>*page=text,Err(_)=>result.limitations.push(format!("OCR could not read page {}.",i+1))}
    }
    result.text=pages.join("\x0c");result.method="PDF text + OCR where needed".into();
    if limited{result.limitations.push("OCR was limited to the first 100 pages; the original file is preserved.".into());}
   }else{
    result.text=tool("tesseract",&[path,"stdout".into(),"-l".into(),"eng+afr".into()],90).await?;
    result.method="Image OCR".into();if result.text.trim().is_empty(){result.limitations.push("No readable text found in this photograph; visual content still needs review.".into());}
   }
  },
  _=>{result.limitations.push("No text extractor is available for this format. The original is preserved.".into());}
 }
 result.text=result.text.replace('\0',"");
 if result.text.len()>8*1024*1024{anyhow::bail!("Extracted text exceeds processing limit; the original is preserved");}
 Ok(result)
}
pub async fn run(app:App){
 // Bounded workers use SKIP LOCKED to claim each document once.
 for _ in 0..std::env::var("DOCUMENT_WORKERS").ok().and_then(|s|s.parse::<usize>().ok()).unwrap_or(2).clamp(1,6){let state=app.clone();tokio::spawn(async move{loop{
  match process_one(&state).await{Ok(true)=>{},Ok(false)=>tokio::time::sleep(std::time::Duration::from_secs(3)).await,Err(e)=>{tracing::warn!(error=%e,"Document worker will retry");tokio::time::sleep(std::time::Duration::from_secs(5)).await;}}
 }});}
}
async fn process_one(app:&App)->Result<bool>{
 sqlx::query("UPDATE resiro.documents SET status='queued',claimed_at=NULL WHERE status IN ('reading','analyzing') AND claimed_at<now()-interval '20 minutes'").execute(&app.db).await?;
 let row:Option<Value>=sqlx::query_scalar("UPDATE resiro.documents AS claimed SET status='reading',attempts=attempts+1,claimed_at=now() WHERE id=(SELECT id FROM resiro.documents WHERE status='queued' AND attempts<4 AND next_attempt_at<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING to_jsonb(claimed)")
  .fetch_optional(&app.db).await?;
 let Some(doc)=row else{return Ok(false)};
 let id=Uuid::parse_str(doc["id"].as_str().unwrap()).map_err(|e|anyhow::anyhow!(e))?;
 match process_document(app,&doc).await{
  Ok(())=>{},
  Err(e)=>{
   tracing::warn!(document_id=%id,error=%e,"Document processing failed");
   sqlx::query("UPDATE resiro.documents SET status=CASE WHEN attempts<4 THEN 'queued' ELSE 'failed' END,error=$1,claimed_at=NULL,next_attempt_at=now()+make_interval(secs=>60*attempts) WHERE id=$2").bind(match &e{Error::Other(inner)=>inner.to_string(),Error::Message(_,message)=>message.clone(),Error::Database(_)=>"Database operation failed; contact support".to_owned()}.chars().take(500).collect::<String>()).bind(id).execute(&app.db).await?;
  }
 }Ok(true)
}
async fn process_document(app:&App,doc:&Value)->Result<()>{
 let id:Uuid=doc["id"].as_str().unwrap().parse().unwrap();let pid:Uuid=doc["property_id"].as_str().unwrap().parse().unwrap();let org:Uuid=doc["org_id"].as_str().unwrap().parse().unwrap();
 let bytes=app.store.get(&app.http,doc["object_key"].as_str().unwrap()).await?;
 if crate::storage::hash(&bytes)!=doc["sha256"].as_str().unwrap(){return Err(Error::Other(anyhow::anyhow!("Stored checksum does not match the source"))); }
 let mut extracted=if let Some(text)=doc["extracted_text"].as_str().filter(|s|!s.is_empty()){
  Extracted{text:text.to_owned(),attachments:Vec::new(),method:doc["extraction"]["method"].as_str().unwrap_or("cached").to_owned(),limitations:doc["extraction"]["limitations"].as_array().into_iter().flatten().filter_map(|v|v.as_str().map(str::to_owned)).collect()}
 }else{extract(doc["name"].as_str().unwrap(),&bytes).await?};
 let user:auth::User=sqlx::query_as("SELECT id,org_id,email,name,role,''::text csrf FROM resiro.users WHERE org_id=$1 ORDER BY created_at LIMIT 1").bind(org).fetch_one(&app.db).await?;
 for (name,body) in std::mem::take(&mut extracted.attachments){
  if crate::storage::excluded(&name){extracted.limitations.push(format!("Excluded native drawing attachment: {name}"));continue;}
  let safe_name=name.rsplit('/').next().unwrap_or(&name);let hash=crate::storage::hash(&body);
  documents::store_one(app,&user,pid,safe_name,body,"Attachment",&format!("{}!{name}",doc["name"].as_str().unwrap()),Some(id),"",&hash).await?;
 }
 sqlx::query("UPDATE resiro.documents SET extracted_text=$1,status=$2,extraction=$3 WHERE id=$4")
  .bind(&extracted.text).bind(if app.ai_key.is_empty(){"ai_pending"}else{"analyzing"})
  .bind(json!({"method":extracted.method,"limitations":extracted.limitations,"checksum_verified":true}))
  .bind(id).execute(&app.db).await?;
 if app.ai_key.is_empty(){return Ok(());}
 let analysis=crate::ai::extract_document(app,doc,&extracted.text,&bytes).await?;
 let mut tx=app.db.begin().await?;
 sqlx::query("DELETE FROM resiro.facts WHERE document_id=$1 AND review_status='unreviewed'").bind(id).execute(&mut *tx).await?;
 for fact in analysis["facts"].as_array().into_iter().flatten(){
  let key=fact["key"].as_str().unwrap_or("other");let quote=fact["quote"].as_str().unwrap_or("");
  let normalized=crate::ai::normalize(&extracted.text);let verified=!quote.is_empty()&&normalized.to_lowercase().contains(&crate::ai::normalize(quote).to_lowercase());
  let confidence=if verified{"quote_matched"}else{"visual_or_unverified"};
  sqlx::query("INSERT INTO resiro.facts(id,property_id,document_id,org_id,fact_key,value,quote,page,confidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)")
   .bind(Uuid::new_v4()).bind(pid).bind(id).bind(org).bind(key).bind(fact.get("value").cloned().unwrap_or(Value::Null)).bind(quote)
   .bind(fact["page"].as_i64().unwrap_or(1) as i32).bind(confidence).execute(&mut *tx).await?;
 }
 for asset in analysis["assets"].as_array().into_iter().flatten(){
  let name=asset["name"].as_str().unwrap_or("Unidentified item");
  if name.trim().is_empty(){continue;}
  sqlx::query("INSERT INTO resiro.assets(id,property_id,org_id,name,category,data,document_id) SELECT $1,$2,$3,$4,$5,$6,$7 WHERE NOT EXISTS(SELECT 1 FROM resiro.assets WHERE property_id=$2 AND document_id=$7 AND name=$4)")
   .bind(Uuid::new_v4()).bind(pid).bind(org).bind(name).bind(asset["category"].as_str().unwrap_or("Contents")).bind(asset).bind(id).execute(&mut *tx).await?;
 }
 sqlx::query("UPDATE resiro.documents SET status=$1,extraction=extraction||$2,processed_at=now(),claimed_at=NULL,error=NULL WHERE id=$3")
  .bind(if extracted.limitations.is_empty()&&analysis["limitations"].as_array().map_or(true,|v|v.is_empty()){"processed"}else{"needs_review"})
  .bind(json!({"analysis":analysis,"model":app.model})).bind(id).execute(&mut *tx).await?;
 if let Some(category)=analysis["filing_category"].as_str(){
  sqlx::query("UPDATE resiro.documents SET category=$1 WHERE id=$2 AND coalesce((extraction->>'filing_reviewed')::boolean,false)=false").bind(category).bind(id).execute(&mut *tx).await?;
 }
 tx.commit().await?;Ok(())
}
