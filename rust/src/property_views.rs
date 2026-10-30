pub async fn property_page(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,Query(q):Query<PageQuery>)->Result<Response>{
 let user=match browser(&app,&headers).await{Ok(u)=>u,Err(r)=>return Ok(r)};let p=property(&app,&user,id).await?;
 let tab=q.tab.as_deref().unwrap_or("overview");
 let docs:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(d)-'extracted_text'-'object_key'-'bucket'-'extraction' || jsonb_build_object('copies',(SELECT count(*) FROM resiro.document_sources s WHERE s.document_id=d.id)) FROM resiro.documents d WHERE property_id=$1 AND org_id=$2 ORDER BY category,title")
  .bind(id).bind(user.org_id).fetch_all(&app.db).await?;
 let facts:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(f)||jsonb_build_object('source_name',d.name) FROM resiro.facts f JOIN resiro.documents d ON d.id=f.document_id WHERE f.property_id=$1 AND f.org_id=$2 AND f.review_status<>'rejected' ORDER BY CASE WHEN fact_key LIKE 'property.%' THEN 0 ELSE 1 END,fact_key,f.created_at DESC LIMIT 2000")
  .bind(id).bind(user.org_id).fetch_all(&app.db).await?;
 let fact_count:i64=sqlx::query_scalar("SELECT count(*) FROM resiro.facts WHERE property_id=$1 AND org_id=$2 AND review_status<>'rejected'").bind(id).bind(user.org_id).fetch_one(&app.db).await?;
 let total=docs.len();let processed=docs.iter().filter(|d|d["status"]=="processed"||d["status"]=="needs_review"||d["status"]=="unlocked").count();
 let queued=docs.iter().filter(|d|["queued","reading","analyzing","ai_pending"].contains(&d["status"].as_str().unwrap_or(""))).count();
 let mut navigation=String::new();
 for (key,label) in [("overview","Overview"),("documents","Documents"),("plans","Plans & certificates"),("finance","Finance"),("insurance","Insurance"),("maintenance","Maintenance"),("assets","Assets & contents"),("contacts","Contacts"),("timeline","Timeline"),("assistant","Ask your property")]{
  navigation.push_str(&format!("<a class=\"{}\" href=\"/properties/{id}?tab={key}\">{label}</a>",if key==tab{"selected"}else{""}));
 }
 let stats=format!("<div class=stats><div><strong>{total}</strong><span>Documents</span></div><div><strong>{processed}</strong><span>Processed</span></div><div><strong>{queued}</strong><span>In progress</span></div><div><strong>{}</strong><span>Extracted facts</span></div></div>",fact_count);
 let content=match tab{
  "documents"=>documents_section(&app,&user,id,&docs,&q).await?,
  "plans"=>format!("<div class=card><h2>Plans, certificates &amp; evidence</h2><p>These checks show what has been located in this property file, not a legal or engineering compliance decision.</p>{}</div>{}",coverage(&docs,queued),document_table(&docs.iter().filter(|d|["Plans & Approvals","Ownership & Legal"].contains(&d["category"].as_str().unwrap_or(""))).cloned().collect::<Vec<_>>())),
  "finance"=>format!("<div class=card><h2>Finance &amp; ownership</h2><p>Your private bond, legal and financial record.</p>{}</div>{}",fact_table(&facts.iter().filter(|f|v(f,"fact_key").starts_with("finance.")||v(f,"fact_key").contains("ownership")).cloned().collect::<Vec<_>>(),&user),document_table(&docs.iter().filter(|d|["Finance & Bond","Ownership & Legal","Construction & Quotes"].contains(&d["category"].as_str().unwrap_or(""))).cloned().collect::<Vec<_>>())),
  "insurance"=>format!("<div class=card><h2>Insurance file</h2><p>Policies, warranties, proof of purchase and the evidence behind your contents list. Candidate assets are not confirmed purchases.</p>{}</div>{}",coverage(&docs,queued),document_table(&docs.iter().filter(|d|["Insurance","Furniture & Contents"].contains(&d["category"].as_str().unwrap_or(""))).cloned().collect::<Vec<_>>())),
  "maintenance"=>format!("{}<h2>Maintenance documents</h2>{}",crate::workflows::property_section(&app,&user,id).await?,document_table(&docs.iter().filter(|d|d["category"]=="Maintenance").cloned().collect::<Vec<_>>())),
  "assets"=>assets_section(&app,&user,id).await?,
  "contacts"=>format!("<div class=card><h2>People &amp; companies</h2><p>Contact details extracted from your documents. Check them against the original before relying on them.</p>{}</div>",fact_table(&facts.iter().filter(|f|["contact","supplier","vendor","email","phone","contractor","architect"].iter().any(|t|v(f,"fact_key").contains(t))).cloned().collect::<Vec<_>>(),&user)),
  "timeline"=>timeline(&app,&user,id).await?,
  "assistant"=>assistant(&app,&user,id,queued).await?,
  _=>overview(&p,&docs,&facts,&user,queued),
 };
 let banner=format!("<section class=hero><div><div class=eyebrow>YOUR PRIVATE PROPERTY FILE</div><h1>{}</h1><p>{}</p></div>{}</section>",e(&v(&p,"name")),e(&v(&p,"address")),badge("Private"));
 let progress=if queued>0{format!("<p class=notice>{queued} documents are still being read. You can use this file now; facts and search results will expand as processing finishes. <a href=\"/properties/{id}?tab={}\">Refresh status</a></p>",enc(tab))}else{String::new()};
 let blocked=docs.iter().filter(|d|["failed","locked"].contains(&v(d,"status").as_str())).count();
 let attention=if blocked>0{format!("<p class=notice>{blocked} files need attention. Their originals are safe. Open Documents to unlock protected PDFs or inspect processing errors.</p>")}else{String::new()};
 let body=format!("{banner}{stats}{progress}{attention}<div class=workspace><aside>{navigation}</aside><section class=content>{content}</section></div>");
 Ok(layout(Some(&user),&v(&p,"name"),body).into_response())
}
fn document_table(docs:&[Value])->String{
 let mut rows=String::new();
 for d in docs{rows.push_str(&format!("<tr><td><a href=\"/documents/{}\"><strong>{}</strong></a><small>{}</small></td><td>{}</td><td>{}</td><td>{} copies</td><td><a href=\"/documents/{}/download\">Download</a></td></tr>",v(d,"id"),e(&v(d,"title")),e(&v(d,"name")),e(&v(d,"category")),badge(&v(d,"status")),v(d,"copies"),v(d,"id")));}
 if rows.is_empty(){return "<div class=empty>No documents in this section yet.</div>".into();}
 format!("<div class=\"card table-wrap\"><table><thead><tr><th>Document</th><th>Filed under</th><th>Processing</th><th>Sources</th><th></th></tr></thead><tbody>{rows}</tbody></table></div>")
}
async fn documents_section(app:&App,user:&auth::User,id:Uuid,docs:&[Value],q:&PageQuery)->Result<String>{
 let mut options=String::from("<option value=''>All sections</option>");let mut categories=docs.iter().map(|d|v(d,"category")).collect::<Vec<_>>();categories.sort();categories.dedup();
 for category in categories{options.push_str(&format!("<option value=\"{}\" {}>{}</option>",e(&category),if q.category.as_deref()==Some(category.as_str()){"selected"}else{""},e(&category)));}
 let search=format!("<div class=card><form class=filter method=get action=/properties/{id}><input type=hidden name=tab value=documents><label>Search your documents<input name=q value=\"{}\" placeholder=\"Invoice, bed, certificate, solar…\"></label><label>Section<select name=category>{options}</select></label><button>Search</button></form></div>",e(q.q.as_deref().unwrap_or("")));
 let results=if let Some(query)=q.q.as_deref().filter(|q|!q.trim().is_empty()){
  let found=crate::documents::search_rows(app,user,id,query).await?;let mut result=String::new();
  for row in found{result.push_str(&format!("<article class=card><a href=\"/documents/{}\"><h3>{}</h3></a><p class=muted>{}</p><p>{}</p></article>",v(&row,"id"),e(&v(&row,"name")),e(&v(&row,"category")),e(&v(&row,"excerpt"))));}if result.is_empty(){"<div class=empty>No matching extracted text or filenames yet. Some documents may still be processing.</div>".into()}else{result}
 }else{document_table(&docs.iter().filter(|d|q.category.as_deref().map_or(true,|c|c.is_empty()||d["category"]==c)).cloned().collect::<Vec<_>>())};
 let upload=format!("<details class=card><summary>Add documents</summary><p>Keep maintenance invoices, warranties and purchase receipts here. CAD/design source files are excluded.</p><form method=post action=/api/documents enctype=multipart/form-data>{}<input type=hidden name=property_id value={id}><input type=hidden name=redirect value=1><label>Documents<input type=file name=file multiple required></label><button>Upload and process</button></form></details>",csrf(user));
 Ok(search+&upload+&results)
}
fn fact_table(facts:&[Value],user:&auth::User)->String{
 let mut result=String::new();
 for f in facts.iter().take(200){result.push_str(&format!("<div class=fact><div><strong>{}</strong><p>{}</p><small><a href=\"/documents/{}\">{}</a> · page {} · {}</small><blockquote>{}</blockquote></div><div>{}<form method=post action=\"/facts/{}/review\">{}<button name=status value=confirmed class=quiet>Confirm</button><button name=status value=rejected class=quiet>Reject</button></form></div></div>",e(&v(f,"fact_key")),e(&v(f,"value")),v(f,"document_id"),e(&v(f,"source_name")),v(f,"page"),e(&v(f,"confidence")),e(&v(f,"quote")),badge(&v(f,"review_status")),v(f,"id"),csrf(user)));}
 if result.is_empty(){"<p class=muted>No extracted values in this section yet.</p>".into()}else{result}
}
fn coverage(docs:&[Value],pending:usize)->String{
 let checks=[("Title / transfer deed",vec!["deed","transfer"]),("Approved building plans",vec!["approved","building plan"]),("Occupancy certificate",vec!["occupancy"]),("Electrical certificate",vec!["electrical","electric coc"]),("Insurance policy",vec!["policy","insurance"]),("Solar installation records",vec!["solar","inverter"]),("Warranties / maintenance invoices",vec!["warranty","invoice"])];
 let mut out=String::from("<div class=checks>");
 for (label,terms) in checks{let found=docs.iter().filter(|d|terms.iter().any(|term|format!("{} {} {}",v(d,"name"),v(d,"title"),d["extraction"]["analysis"]["document_type"]).to_lowercase().contains(term))).collect::<Vec<_>>();
  out.push_str(&format!("<div><strong>{}</strong>{}<span>{}</span></div>",e(label),badge(if found.is_empty(){if pending>0{"Not yet identified"}else{"Not located"}}else{"Evidence located"}),found.iter().take(3).map(|d|format!("<a href=\"/documents/{}\">{}</a>",v(d,"id"),e(&v(d,"title")))).collect::<Vec<_>>().join(" · ")));
 }out.push_str("</div>");out
}
fn overview(p:&Value,docs:&[Value],facts:&[Value],user:&auth::User,pending:usize)->String{
 let id=v(p,"id");let mut metrics=String::new();
 for (key,label) in [("bedrooms","Bedrooms"),("bathrooms","Bathrooms"),("toilets","Toilets"),("garages","Garages"),("floor_area_m2","Floor area (m²)"),("stand_area_m2","Stand area (m²)")]{
  let confirmed=v(&p["data"],key);
  let candidates=facts.iter().filter(|f|v(f,"fact_key")==format!("property.{key}")).collect::<Vec<_>>();
  let value=if !confirmed.is_empty(){confirmed}else{let reviewed=candidates.iter().filter(|f|f["review_status"]=="confirmed").copied().collect::<Vec<_>>();let chosen=if reviewed.is_empty(){&candidates}else{&reviewed};let mut values=chosen.iter().map(|f|v(f,"value")).collect::<Vec<_>>();values.sort();values.dedup();if values.len()==1{format!("{} · {}",values[0],if reviewed.is_empty(){"candidate"}else{"confirmed"})}else{"Needs confirmation".into()}};
  metrics.push_str(&format!("<div><span>{label}</span><strong>{}</strong></div>",e(&value)));
 }
 let mut fields=String::new();for (key,label,kind) in [("erf_number","Stand / ERF","text"),("estate","Estate / suburb","text"),("municipality","Municipality","text"),("bedrooms","Bedrooms","number"),("bathrooms","Bathrooms","number"),("toilets","Toilets","number"),("garages","Garages","number"),("floor_area_m2","Floor area (m²)","number"),("stand_area_m2","Stand area (m²)","number"),("features","Features (comma-separated)","text")]{
  fields.push_str(&input(key,label,&v(&p["data"],key),kind));
 }
 format!("<div class=card><div class=eyebrow>AT A GLANCE</div><h2>A complete picture of your property</h2><div class=metrics>{metrics}</div></div><details class=card><summary>Update property details</summary><form method=post action=/properties/{id}>{}<div class=form-grid>{}{fields}</div><button>Save property details</button></form></details><div class=card><h2>Documentation coverage</h2><p>Evidence located in your file; these are not compliance approvals.</p>{}</div><details class=card><summary>Extracted property details (review candidates)</summary>{}</details>",csrf(user),input("name","Property name",&v(p,"name"),"text"),coverage(docs,pending),fact_table(&facts.iter().filter(|f|v(f,"fact_key").starts_with("property.")||v(f,"fact_key").starts_with("solar.")||v(f,"fact_key").starts_with("water.")).cloned().collect::<Vec<_>>(),user))
}
