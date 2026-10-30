async fn decrypted_pdf(bytes:&[u8],password:&str)->anyhow::Result<Vec<u8>>{
 let input=tempfile::NamedTempFile::new()?;let output=tempfile::NamedTempFile::new()?;
 tokio::fs::write(input.path(),bytes).await?;
 let mut command=tokio::process::Command::new("qpdf");
 command.arg("--warning-exit-0").arg("--password-file=-").arg("--decrypt").arg(input.path()).arg(output.path())
  .stdin(std::process::Stdio::piped()).stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null()).kill_on_drop(true);
 let mut child=command.spawn()?;let mut pipe=child.stdin.take().ok_or_else(||anyhow::anyhow!("Unable to open private decryption input"))?;
 tokio::io::AsyncWriteExt::write_all(&mut pipe,password.as_bytes()).await?;tokio::io::AsyncWriteExt::shutdown(&mut pipe).await?;drop(pipe);
 let result=tokio::time::timeout(std::time::Duration::from_secs(60),child.wait_with_output()).await??;
 if !result.status.success(){anyhow::bail!("That password did not unlock this PDF. Please check it and try again.");}
 Ok(tokio::fs::read(output.path()).await?)
}
async fn unlock_one(app:&App,user:&auth::User,id:Uuid,password:&str)->Result<Uuid>{
 if password.is_empty()||password.len()>256{return Err(bad("Enter the document password"));}
 let row:Option<(Uuid,String,String,String,String)>=sqlx::query_as("SELECT property_id,name,object_key,sha256,mime FROM resiro.documents WHERE id=$1 AND org_id=$2")
  .bind(id).bind(user.org_id).fetch_optional(&app.db).await?;
 let (pid,name,key,sha,mime)=row.ok_or_else(missing)?;
 if mime!="application/pdf"{return Err(bad("Only protected PDFs can be unlocked here"));}
 let original=app.store.get(&app.http,&key).await?;
 if storage::hash(&original)!=sha{return Err(bad("Stored original checksum mismatch"));}
 let readable=decrypted_pdf(&original,password).await.map_err(|e|bad(&e.to_string()))?;
 let readable_name=format!("{} - readable copy.pdf",name.strip_suffix(".pdf").or_else(||name.strip_suffix(".PDF")).unwrap_or(&name));
 let (copy,_)=store_one(app,user,pid,&readable_name,readable,"Unlocked copy",&name,Some(id),"",&sha).await?;
 sqlx::query("UPDATE resiro.documents SET status='unlocked',error=NULL,extraction=extraction||jsonb_build_object('readable_copy_id',$1::text),claimed_at=NULL WHERE id=$2 AND org_id=$3").bind(copy.to_string()).bind(id).bind(user.org_id).execute(&app.db).await?;
 crate::event(app,user,Some(pid),"document_unlocked","Protected document unlocked",json!({"original_document_id":id,"readable_copy_id":copy,"original_preserved":true})).await?;
 Ok(copy)
}
pub async fn unlock_form(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,Form(input):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,input.get("csrf").map(String::as_str).unwrap_or(""))?;
 let copy=unlock_one(&app,&user,id,input.get("password").map(String::as_str).unwrap_or("")).await?;
 Ok(Redirect::to(&format!("/documents/{copy}")))
}
pub async fn unlock_json(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,Json(input):Json<Value>)->Result<Json<Value>>{
 let user=auth::user(&app,&headers).await?;auth::api_csrf(&app,&user,&headers,input["csrf"].as_str())?;
 let copy=unlock_one(&app,&user,id,input["password"].as_str().unwrap_or("")).await?;
 Ok(Json(json!({"id":copy,"original_preserved":true})))
}
