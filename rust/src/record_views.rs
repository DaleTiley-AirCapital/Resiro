pub async fn save_property(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,Form(input):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,input.get("csrf").map(String::as_str).unwrap_or(""))?;let old=property(&app,&user,id).await?;
 let mut data=old["data"].clone();
 for key in ["erf_number","estate","municipality","bedrooms","bathrooms","toilets","garages","floor_area_m2","stand_area_m2","features"]{
  if let Some(value)=input.get(key){if value.len()>2000{return Err(bad("A property field is too long"));}data[key]=json!(value);}
 }
 let name=input.get("name").filter(|s|!s.trim().is_empty()).cloned().unwrap_or(v(&old,"name"));
 sqlx::query("UPDATE resiro.properties SET name=$1,data=$2,updated_at=now() WHERE id=$3 AND org_id=$4").bind(name).bind(data).bind(id).bind(user.org_id).execute(&app.db).await?;
 Ok(Redirect::to(&format!("/properties/{id}")))
}
pub async fn properties_json(State(app):State<App>,headers:HeaderMap)->Result<Json<Value>>{
 let user=auth::user(&app,&headers).await?;
 let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(p) FROM resiro.properties p WHERE org_id=$1").bind(user.org_id).fetch_all(&app.db).await?;Ok(Json(json!(rows)))
}
pub async fn property_json(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>)->Result<Json<Value>>{let user=auth::user(&app,&headers).await?;Ok(Json(property(&app,&user,id).await?))}
#[derive(Deserialize, Default)]
pub struct PreviewQuery { page: Option<u32> }

pub async fn document_page(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,Query(query):Query<PreviewQuery>)->Result<Response>{
 let user=match browser(&app,&headers).await{Ok(u)=>u,Err(r)=>return Ok(r)};
 let doc:Value=sqlx::query_scalar("SELECT to_jsonb(d) FROM resiro.documents d WHERE id=$1 AND org_id=$2").bind(id).bind(user.org_id).fetch_optional(&app.db).await?.ok_or_else(missing)?;
 let sources:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(s) FROM resiro.document_sources s WHERE document_id=$1").bind(id).fetch_all(&app.db).await?;
 let facts:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(f)||jsonb_build_object('source_name',$2::text) FROM resiro.facts f WHERE document_id=$1 AND org_id=$3 ORDER BY fact_key").bind(id).bind(v(&doc,"name")).bind(user.org_id).fetch_all(&app.db).await?;
 let origins=sources.iter().map(|s|format!("<li>{} / {}<small>Original modified: {} · Source checksum: {}</small></li>",e(&v(s,"source_root")),e(&v(s,"source_path")),e(&v(s,"modified_at")),e(&v(s,"source_sha256")))).collect::<String>();
 let summary=v(&doc["extraction"]["analysis"],"summary");let limitations=doc["extraction"]["limitations"].as_array().cloned().unwrap_or_default();
 let mime = v(&doc, "mime");
 let preview_id = doc["extraction"]["readable_copy_id"].as_str()
     .and_then(|value| value.parse::<Uuid>().ok()).unwrap_or(id);
 let pdf_pages = if mime == "application/pdf" && preview_id != id {
     let count: Option<i32> = sqlx::query_scalar(
         "SELECT length(extracted_text)-length(replace(extracted_text, chr(12), '')) FROM resiro.documents WHERE id=$1 AND org_id=$2"
     ).bind(preview_id).bind(user.org_id).fetch_optional(&app.db).await?;
     count.unwrap_or(0).max(0) as u32
 } else {
     doc["extracted_text"].as_str().unwrap_or("").matches('\x0c').count() as u32
 };
 let last_page = if mime != "application/pdf" { 1 } else if pdf_pages > 0 { pdf_pages } else { 10000 };
 let page = query.page.unwrap_or(1).clamp(1, last_page);
 let preview = if (doc["status"] != "locked" || preview_id != id)
     && matches!(mime.as_str(), "application/pdf" | "image/png" | "image/jpeg") {
     let navigation = if mime == "application/pdf" {
         let previous = if page > 1 { format!("<a href=\"?page={}#preview\">← Previous page</a>", page - 1) } else { String::new() };
         let next = if page < last_page { format!("<a href=\"?page={}#preview\">Next page →</a>", page + 1) } else { String::new() };
         let position = if pdf_pages > 0 { format!("Page {page} of {pdf_pages}") } else { format!("Page {page}") };
         format!("<nav class=preview-nav>{previous}<span>{position}</span>{next}<form action=\"/documents/{id}#preview\"><label>Page number<input type=number name=page min=1 max={last_page} value={page}></label><button class=quiet>Go</button></form></nav>")
     } else { String::new() };
     format!("{navigation}<a href=\"/documents/{preview_id}/preview/{page}?detail=true\" title=\"Open larger preview\"><img class=document-image src=/documents/{preview_id}/preview/{page} alt=\"Document page {page}. Try a different page number if it is unavailable.\"></a><p class=muted><a href=\"/documents/{preview_id}/preview/{page}?detail=true\">Open larger preview</a></p>")
 } else if doc["status"] == "locked" {
     "<p>Unlock this PDF below to preview it.</p>".into()
 } else {
     let text = v(&doc, "extracted_text");
     if text.trim().is_empty() { "<p>A preview is unavailable for this file.</p>".into() }
     else { format!("<p>Text preview</p><pre>{}</pre>", e(&text.chars().take(16000).collect::<String>())) }
 };
 let summary = if summary.is_empty() { "A summary is not available yet.".into() } else { summary };
 let mut body=format!("<p><a href=\"/properties/{}?tab=documents\">← Property documents</a></p><section class=hero><div><div class=eyebrow>DOCUMENT RECORD</div><h1>{}</h1><p>{}</p></div></section><section class=card><h2>Document summary</h2><p>{}</p><p class=muted>Extracted values are drafts until reviewed.</p></section><section class=card id=preview><h2>Document preview</h2>{preview}</section><section class=card>{}<p>{}</p><a href=/documents/{id}/download>Download original</a><details><summary>Original file integrity</summary><p class=muted>{} bytes · SHA-256 {}</p></details>{}<ul>{}</ul></section><details class=card><summary>File name, category and original locations</summary><form method=post action=/documents/{id}>{}{}{}<button>Save filing</button></form><ul>{origins}</ul></details><details class=card><summary>Extracted facts ({})</summary>{}</details><details class=card><summary>Full extracted text</summary><pre>{}</pre></details><form method=post action=/documents/{id}/retry>{}<button class=quiet>Retry document processing</button></form>",
  v(&doc,"property_id"),e(&v(&doc,"title")),e(&v(&doc,"category")),e(&summary),badge(&v(&doc,"status")),e(&v(&doc,"error")),v(&doc,"bytes"),v(&doc,"sha256"),
  if doc["extraction"]["checksum_verified"]==true{"<p>Stored original checksum verified.</p>"}else{""},
  limitations.iter().map(|s|format!("<li>{}</li>",e(s.as_str().unwrap_or("")))).collect::<String>(),
  csrf(&user),input("title","Document title",&v(&doc,"title"),"text"),input("category","Filed under",&v(&doc,"category"),"text"),facts.len(),fact_table(&facts,&user),e(&v(&doc,"extracted_text")),csrf(&user));
 if doc["mime"]=="application/pdf"&&["locked","failed"].contains(&v(&doc,"status").as_str()){
  body.push_str(&format!("<section class=card><h2>Unlock protected PDF</h2><p>Your encrypted original stays in the vault. The password is used only to create a private readable copy and is not saved.</p><form method=post action=/documents/{id}/unlock>{}<label>Document password<input type=password name=password autocomplete=off required maxlength=256></label><button>Unlock privately</button></form></section>",csrf(&user)));
 }
 if let Some(copy)=doc["extraction"]["readable_copy_id"].as_str(){if copy.parse::<Uuid>().is_ok(){body.push_str(&format!("<section class=card><a href=/documents/{copy}>Open readable copy</a><p>The encrypted original is preserved.</p></section>"));}}
 Ok(layout(Some(&user),&v(&doc,"title"),body).into_response())
}
async fn assets_section(app:&App,user:&auth::User,id:Uuid)->Result<String>{
 let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(a) FROM resiro.assets a WHERE property_id=$1 AND org_id=$2 ORDER BY category,name").bind(id).bind(user.org_id).fetch_all(&app.db).await?;
 let mut table=String::new();
 for a in rows{let data=&a["data"];table.push_str(&format!("<tr><td><strong>{}</strong><small>{} {}</small></td><td>{}</td><td>{} {}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
  e(&v(&a,"name")),e(&v(data,"make")),e(&v(data,"model")),e(&v(&a,"room")),e(&v(data,"currency")),e(&v(data,"total_price")),e(&v(data,"vendor")),badge(&format!("{} · {}",v(&a,"review_status"),v(data,"document_state"))),if a["document_id"].is_null(){"Owner entry".to_owned()}else{format!("<a href=/documents/{}>Source</a>",v(&a,"document_id"))}));}
 Ok(format!("<div class=card><h2>Assets &amp; contents</h2><p>Purchased items, receipts, serial numbers and warranties. Quoted and unreviewed items remain candidates; they are not proof of ownership or insured value.</p><div class=table-wrap><table><thead><tr><th>Item</th><th>Room</th><th>Price</th><th>Supplier</th><th>Review</th><th></th></tr></thead><tbody>{table}</tbody></table></div></div><details class=card><summary>Add an item</summary><form method=post action=/properties/{id}/assets>{}{}{}{}{}{}<button>Save item</button></form></details>",csrf(user),input("name","Item name","","text"),input("category","Category","Contents","text"),input("room","Room","","text"),input("vendor","Bought from","","text"),input("total_price","Purchase price (ZAR)","","number")))
}
pub async fn save_asset(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,Form(input):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,input.get("csrf").map(String::as_str).unwrap_or(""))?;property(&app,&user,id).await?;
 let name=input.get("name").map(String::as_str).unwrap_or("").trim();if name.is_empty(){return Err(bad("Item name required"));}
 sqlx::query("INSERT INTO resiro.assets(id,property_id,org_id,name,category,room,data,review_status) VALUES($1,$2,$3,$4,$5,$6,$7,'owner_entered')")
  .bind(Uuid::new_v4()).bind(id).bind(user.org_id).bind(name).bind(input.get("category").cloned().unwrap_or("Contents".into())).bind(input.get("room").cloned().unwrap_or_default())
  .bind(json!({"vendor":input.get("vendor"),"total_price":input.get("total_price"),"currency":"ZAR","document_state":"owner_entered"})).execute(&app.db).await?;
 Ok(Redirect::to(&format!("/properties/{id}?tab=assets")))
}
async fn timeline(app:&App,user:&auth::User,id:Uuid)->Result<String>{
 let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(e) FROM resiro.events e WHERE property_id=$1 AND org_id=$2 ORDER BY created_at DESC LIMIT 100").bind(id).bind(user.org_id).fetch_all(&app.db).await?;
 Ok(format!("<div class=card><h2>Property timeline</h2>{}</div>",rows.iter().map(|r|format!("<article class=timeline><small>{}</small><h3>{}</h3><p>{}</p></article>",e(&v(r,"created_at")),e(&v(r,"title")),e(&v(r,"kind")))).collect::<String>()))
}
async fn assistant(app:&App,user:&auth::User,id:Uuid,pending:usize)->Result<String>{
 let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(q) FROM resiro.questions q WHERE property_id=$1 AND org_id=$2 ORDER BY created_at DESC LIMIT 20").bind(id).bind(user.org_id).fetch_all(&app.db).await?;
 let mut history=String::new();
 for q in rows{let answer=&q["answer"];let cites=answer["citations"].as_array().into_iter().flatten().map(|c|format!("<li><a href=/documents/{}>{}</a> · page {}<blockquote>{}</blockquote>{}</li>",v(c,"document_id"),e(&v(c,"source_name")),v(c,"page"),e(&v(c,"quote")),if c["quote_matched"]==true{"<small>Quote matched to extracted text</small>"}else{"<small class=warning>Transcription needs source review</small>"})).collect::<String>();
  history.push_str(&format!("<article class=card><div class=eyebrow>YOUR QUESTION</div><h3>{}</h3><p class=answer>{}</p>{}<ul>{cites}</ul></article>",e(&v(&q,"question")),e(&v(answer,"answer")),badge(&v(answer,"confidence"))));
 }
 Ok(format!("<div class=card><div class=eyebrow>YOUR PROPERTY ASSISTANT</div><h2>Ask once. Find the evidence.</h2><p>Try “What bed did I buy, what did it cost and where did I buy it?” or “Which documents have not been located yet?”</p><p class=muted>{pending} documents still processing. Answers cite your private file and distinguish extracted candidates from confirmed information.</p><form method=post action=/properties/{id}/ask>{}<label>Your question<textarea name=question required maxlength=2000 placeholder=\"Ask about your property, purchases or documents…\"></textarea></label><button>Ask your property</button></form></div>{history}",csrf(user)))
}
pub async fn supplier(State(app):State<App>,headers:HeaderMap)->Result<Response>{
 let user=match browser(&app,&headers).await{Ok(u)=>u,Err(r)=>return Ok(r)};
 if user.role!="supplier"{return Ok(Redirect::to("/app").into_response());}
 let body=crate::workflows::supplier_section(&app,&user).await?;
 Ok(layout(Some(&user),"Supplier console",body).into_response())
}

pub async fn assets_json(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>)->Result<Json<Value>>{
 let user=auth::user(&app,&headers).await?;property(&app,&user,id).await?;
 let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(a) FROM resiro.assets a WHERE property_id=$1 AND org_id=$2 ORDER BY created_at DESC")
 .bind(id).bind(user.org_id).fetch_all(&app.db).await?;Ok(Json(json!(rows)))
}
pub async fn activity_json(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>)->Result<Json<Value>>{
 let user=auth::user(&app,&headers).await?;property(&app,&user,id).await?;
 let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(e) FROM resiro.events e WHERE property_id=$1 AND org_id=$2 ORDER BY created_at DESC LIMIT 200")
 .bind(id).bind(user.org_id).fetch_all(&app.db).await?;Ok(Json(json!(rows)))
}
