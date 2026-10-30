use crate::{App,Result,bad,missing,auth,property,pages::{e,v,csrf,input,badge}};
use axum::{Router,routing::{get,post},extract::{State,Path,Form},http::HeaderMap,response::Redirect};
use serde_json::{Value,json};
use uuid::Uuid;
use chrono::{Utc,DateTime,Duration,Datelike,Timelike};
use std::collections::HashMap;

pub fn routes()->Router<App>{
 Router::new().route("/properties/{id}/reminders",post(add_reminder))
 .route("/reminders/{id}/action",post(reminder_action))
 .route("/properties/{id}/bookings",post(add_booking))
 .route("/bookings/{id}/action",post(booking_action))
 .route("/notifications/{id}/read",post(read_notice))
 .route("/supplier/profile",post(save_profile))
 .route("/supplier/jobs",post(add_job))
 .route("/api/notifications",get(notices_json))
}
fn parse_time(s:&str)->Result<DateTime<Utc>>{
 if let Ok(value)=DateTime::parse_from_rfc3339(s){return Ok(value.with_timezone(&Utc));}
 let parsed=chrono::NaiveDateTime::parse_from_str(s,"%Y-%m-%dT%H:%M").or_else(|_|chrono::NaiveDateTime::parse_from_str(s,"%Y-%m-%dT%H:%M:%S")).map_err(|_|bad("Choose a valid date and time"))?;
 Ok((parsed-Duration::hours(2)).and_utc())
}
fn local(t:DateTime<Utc>)->String{(t+Duration::hours(2)).format("%Y-%m-%dT%H:%M").to_string()}
async fn notify(app:&App,org:Uuid,key:&str,title:&str,message:&str,path:&str)->Result<()>{
 sqlx::query("INSERT INTO resiro.notifications(id,org_id,source_key,title,message,path) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(source_key) DO NOTHING")
  .bind(Uuid::new_v4()).bind(org).bind(key).bind(title).bind(message).bind(path).execute(&app.db).await?;Ok(())
}
pub async fn inbox(app:&App,user:&auth::User)->Result<String>{
 let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(n) FROM resiro.notifications n WHERE org_id=$1 ORDER BY created_at DESC LIMIT 20").bind(user.org_id).fetch_all(&app.db).await?;
 let unread=rows.iter().filter(|n|n["read_at"].is_null()).count();let mut list=String::new();
 for n in rows{list.push_str(&format!("<article class=timeline><a href=\"{}\"><strong>{}</strong></a><p>{}</p>{}</article>",e(&v(&n,"path")),e(&v(&n,"title")),e(&v(&n,"message")),if n["read_at"].is_null(){format!("<form method=post action=/notifications/{}/read>{}<button class=quiet>Mark read</button></form>",v(&n,"id"),csrf(user))}else{String::new()}));}
 Ok(format!("<details class=card><summary>Inbox · {unread} unread</summary>{list}</details>"))
}
pub async fn notices_json(State(app):State<App>,headers:HeaderMap)->Result<axum::Json<Value>>{
 let user=auth::user(&app,&headers).await?;let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(n) FROM resiro.notifications n WHERE org_id=$1 ORDER BY created_at DESC LIMIT 100").bind(user.org_id).fetch_all(&app.db).await?;Ok(axum::Json(json!(rows)))
}
pub async fn read_notice(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,Form(input):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,input.get("csrf").map(String::as_str).unwrap_or(""))?;
 sqlx::query("UPDATE resiro.notifications SET read_at=now() WHERE id=$1 AND org_id=$2").bind(id).bind(user.org_id).execute(&app.db).await?;Ok(Redirect::to("/app"))
}
pub async fn add_reminder(State(app):State<App>,headers:HeaderMap,Path(pid):Path<Uuid>,Form(data):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,data.get("csrf").map(String::as_str).unwrap_or(""))?;property(&app,&user,pid).await?;
 let title=data.get("title").filter(|s|!s.trim().is_empty()).ok_or_else(||bad("Reminder title required"))?;
 let due=parse_time(data.get("due_at").map(String::as_str).unwrap_or(""))?;
 let recurrence=data.get("recurrence").map(String::as_str).unwrap_or("none");if !["none","daily","weekly","monthly"].contains(&recurrence){return Err(bad("Invalid recurrence"));}
 sqlx::query("INSERT INTO resiro.reminders(id,property_id,org_id,title,description,due_at,recurrence) VALUES($1,$2,$3,$4,$5,$6,$7)")
  .bind(Uuid::new_v4()).bind(pid).bind(user.org_id).bind(title).bind(data.get("description").cloned().unwrap_or_default()).bind(due).bind(recurrence).execute(&app.db).await?;
 crate::event(&app,&user,Some(pid),"reminder","Reminder created",json!({"title":title,"due_at":due})).await?;
 Ok(Redirect::to(&format!("/properties/{pid}?tab=maintenance")))
}
pub async fn reminder_action(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,Form(data):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,data.get("csrf").map(String::as_str).unwrap_or(""))?;
 let row:Value=sqlx::query_scalar("SELECT to_jsonb(r) FROM resiro.reminders r WHERE id=$1 AND org_id=$2").bind(id).bind(user.org_id).fetch_optional(&app.db).await?.ok_or_else(missing)?;
 let revision=data.get("revision").and_then(|s|s.parse::<i32>().ok()).ok_or_else(||bad("Refresh this reminder"))?;
 let mut due=DateTime::parse_from_rfc3339(row["due_at"].as_str().unwrap()).map_err(|_|bad("Invalid due date"))?.with_timezone(&Utc);
 let mut status="open";
 match data.get("action").map(String::as_str).unwrap_or(""){
  "complete"=>{let recurrence=row["recurrence"].as_str().unwrap_or("none");if recurrence=="none"{status="completed";}else{
   loop{due=match recurrence{"daily"=>due+Duration::days(1),"weekly"=>due+Duration::days(7),"monthly"=>due.checked_add_months(chrono::Months::new(1)).ok_or_else(||bad("Date is out of range"))?,_=>return Err(bad("Invalid recurrence"))};if due>Utc::now(){break;}}
  }},
  "cancel"=>status="cancelled",
  "reschedule"=>due=parse_time(data.get("due_at").map(String::as_str).unwrap_or(""))?,
  _=>return Err(bad("Unknown reminder action"))
 }
 let changed=sqlx::query("UPDATE resiro.reminders SET status=$1,due_at=$2,notified_due=NULL,revision=revision+1 WHERE id=$3 AND org_id=$4 AND revision=$5")
  .bind(status).bind(due).bind(id).bind(user.org_id).bind(revision).execute(&app.db).await?;
 if changed.rows_affected()==0{return Err(bad("This reminder changed. Refresh and try again."));}
 Ok(Redirect::to(&format!("/properties/{}?tab=maintenance",v(&row,"property_id"))))
}
fn reminder_list(rows:&[Value],user:&auth::User)->String{
 rows.iter().map(|r|format!("<article class=card><h3>{}</h3>{}<p>{} · {}</p><p>{}</p><form method=post action=/reminders/{}/action>{}<input type=hidden name=revision value={}><button name=action value=complete>Complete</button><button class=quiet name=action value=cancel>Cancel</button><label>Reschedule<input type=datetime-local name=due_at></label><button class=quiet name=action value=reschedule>Save new date</button></form></article>",e(&v(r,"title")),badge(&v(r,"status")),e(&v(r,"due_at")),e(&v(r,"recurrence")),e(&v(r,"description")),v(r,"id"),csrf(user),v(r,"revision"))).collect()
}
pub async fn property_section(app:&App,user:&auth::User,pid:Uuid)->Result<String>{
 let reminders:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(r) FROM resiro.reminders r WHERE property_id=$1 AND org_id=$2 ORDER BY due_at").bind(pid).bind(user.org_id).fetch_all(&app.db).await?;
 let bookings:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(b)||jsonb_build_object('supplier_name',u.name) FROM resiro.bookings b LEFT JOIN resiro.users u ON u.org_id=b.supplier_org AND u.role='supplier' WHERE property_id=$1 AND owner_org=$2 ORDER BY start_at").bind(pid).bind(user.org_id).fetch_all(&app.db).await?;
 let suppliers:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(u)-'password_hash' FROM resiro.users u WHERE role='supplier' AND org_id<>$1 AND coalesce((profile->>'accept_bookings')::boolean,false)=true").bind(user.org_id).fetch_all(&app.db).await?;
 let options=suppliers.iter().filter(|s|user.email=="dale.tiley@email.com"||s["email"]!="info@millenniumroofing.co.za").map(|s|format!("<option value=\"{}\">{}</option>",v(s,"org_id"),e(&v(s,"name")))).collect::<String>();
 let reminder_form=format!("<details class=card open><summary>Create a reminder</summary><p>Times use South Africa time. Due items appear in your inbox.</p><form method=post action=/properties/{pid}/reminders>{}{}{}<label>Details<textarea name=description></textarea></label><label>Repeat<select name=recurrence><option>none</option><option>daily</option><option>weekly</option><option>monthly</option></select></label><button>Save reminder</button></form></details>",csrf(user),input("title","Reminder title","","text"),input("due_at","Due date and time",&local(Utc::now()+Duration::days(1)),"datetime-local"));
 let booking_form=format!("<details class=card><summary>Request a service appointment</summary><p>Supplier confirmation is required. No booking is confirmed until accepted. Public demo suppliers cannot receive private property details.</p><form method=post action=/properties/{pid}/bookings>{}{}<label>Supplier<select name=supplier_org required><option value=''>Choose a supplier</option>{options}</select></label>{}<label>Duration<select name=duration><option value=60>60 minutes</option><option value=30>30 minutes</option><option value=120>120 minutes</option></select></label><label>Details shared with supplier<textarea name=description></textarea></label><button>Request appointment</button></form></details>",csrf(user),input("title","Service required","","text"),input("start_at","Preferred time (Mon–Fri, 08:00–17:00 SAST)",&local(Utc::now()+Duration::days(1)),"datetime-local"));
 Ok(format!("{reminder_form}{}<h2>Appointments</h2>{booking_form}{}",reminder_list(&reminders,user),booking_list(&bookings,user,false)))
}
pub async fn add_booking(State(app):State<App>,headers:HeaderMap,Path(pid):Path<Uuid>,Form(data):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,data.get("csrf").map(String::as_str).unwrap_or(""))?;let p=property(&app,&user,pid).await?;
 let supplier:Uuid=data.get("supplier_org").ok_or_else(||bad("Choose a supplier"))?.parse().map_err(|_|bad("Invalid supplier"))?;
 let provider:Value=sqlx::query_scalar("SELECT to_jsonb(u)-'password_hash' FROM resiro.users u WHERE org_id=$1 AND role='supplier' AND coalesce((profile->>'accept_bookings')::boolean,false)=true LIMIT 1").bind(supplier).fetch_optional(&app.db).await?.ok_or_else(missing)?;
 if user.email!="dale.tiley@email.com"&&provider["email"]=="info@millenniumroofing.co.za"{return Err(bad("Public demo suppliers cannot receive private property information"));}
 let start=parse_time(data.get("start_at").map(String::as_str).unwrap_or(""))?;
 let duration=data.get("duration").and_then(|s|s.parse::<i64>().ok()).unwrap_or(60);if ![30,60,90,120,180,240].contains(&duration){return Err(bad("Choose a duration in 30-minute steps"));}
 let end=start+Duration::minutes(duration);let local=start+Duration::hours(2);let local_end=end+Duration::hours(2);
 if start<=Utc::now()+Duration::minutes(5)||start>Utc::now()+Duration::days(180)||local.weekday().number_from_monday()>5||local.hour()<8||local_end.hour()>17||(local_end.hour()==17&&local_end.minute()>0)||local.minute()%30!=0{return Err(bad("Choose a future weekday time between 08:00 and 17:00 South Africa time"));}
 let title=data.get("title").filter(|s|!s.trim().is_empty()).ok_or_else(||bad("Service description required"))?;
 let mut tx=app.db.begin().await?;sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))").bind(supplier.to_string()).execute(&mut *tx).await?;
 let conflict:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM resiro.bookings WHERE supplier_org=$1 AND status='confirmed' AND start_at<$3 AND end_at>$2)").bind(supplier).bind(start).bind(end).fetch_one(&mut *tx).await?;
 if conflict{return Err(bad("The supplier already has an appointment at this time"));}
 let id=Uuid::new_v4();sqlx::query("INSERT INTO resiro.bookings(id,property_id,owner_org,supplier_org,title,description,start_at,end_at,history) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)")
  .bind(id).bind(pid).bind(user.org_id).bind(supplier).bind(title).bind(data.get("description").cloned().unwrap_or_default()).bind(start).bind(end).bind(json!([{"status":"requested","at":Utc::now()}])).execute(&mut *tx).await?;tx.commit().await?;
 notify(&app,supplier,&format!("{id}:requested"),"New booking request",&format!("{} — {}",title,v(&p,"address")),"/supplier").await?;
 notify(&app,user.org_id,&format!("{id}:requested-owner"),"Appointment requested","Waiting for supplier confirmation",&format!("/properties/{pid}?tab=maintenance")).await?;
 Ok(Redirect::to(&format!("/properties/{pid}?tab=maintenance")))
}
pub async fn booking_action(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,Form(data):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,data.get("csrf").map(String::as_str).unwrap_or(""))?;
 let row:Value=sqlx::query_scalar("SELECT to_jsonb(b) FROM resiro.bookings b WHERE id=$1 AND (owner_org=$2 OR supplier_org=$2)").bind(id).bind(user.org_id).fetch_optional(&app.db).await?.ok_or_else(missing)?;
 let supplier:Uuid=v(&row,"supplier_org").parse().unwrap();let owner:Uuid=v(&row,"owner_org").parse().unwrap();let pid:Uuid=v(&row,"property_id").parse().unwrap();
 let provider=user.org_id==supplier&&user.role=="supplier";let state=v(&row,"status");
 let action=data.get("action").map(String::as_str).unwrap_or("");
 let status=match(action,provider,state.as_str()){("accept",true,"requested")=>"confirmed",("decline",true,"requested")=>"declined",("cancel",_,"requested"|"confirmed")=>"cancelled",("complete",true,"confirmed")=>"completed",_=>return Err(bad("This action is not allowed for the appointment"))};
 let revision=data.get("revision").and_then(|s|s.parse::<i32>().ok()).ok_or_else(||bad("Refresh this booking"))?;
 let start=DateTime::parse_from_rfc3339(row["start_at"].as_str().unwrap()).unwrap().with_timezone(&Utc);let end=DateTime::parse_from_rfc3339(row["end_at"].as_str().unwrap()).unwrap().with_timezone(&Utc);
 if status=="completed"&&start>Utc::now(){return Err(bad("The appointment cannot be completed before its start"));}
 let mut tx=app.db.begin().await?;sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))").bind(supplier.to_string()).execute(&mut *tx).await?;
 if status=="confirmed"{let conflict:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM resiro.bookings WHERE supplier_org=$1 AND id<>$4 AND status='confirmed' AND start_at<$3 AND end_at>$2)").bind(supplier).bind(start).bind(end).bind(id).fetch_one(&mut *tx).await?;if conflict{return Err(bad("Another appointment is already confirmed at this time"));}}
 let changed=sqlx::query("UPDATE resiro.bookings SET status=$1,revision=revision+1,history=history||$2 WHERE id=$3 AND revision=$4").bind(status).bind(json!([{"status":status,"at":Utc::now()}])).bind(id).bind(revision).execute(&mut *tx).await?;
 if changed.rows_affected()==0{return Err(bad("This booking changed. Refresh it first"));}tx.commit().await?;
 notify(&app,owner,&format!("{id}:{status}:{}",revision+1),&format!("Booking {status}"),&v(&row,"title"),&format!("/properties/{pid}?tab=maintenance")).await?;
 notify(&app,supplier,&format!("{id}:{status}:{}:supplier",revision+1),&format!("Booking {status}"),&v(&row,"title"),"/supplier").await?;
 Ok(Redirect::to(if provider{"/supplier"}else{"/app"}))
}
fn booking_list(rows:&[Value],user:&auth::User,supplier:bool)->String{
 rows.iter().map(|b|format!("<article class=card><h3>{}</h3>{}<p>{} — {}</p><p>{}</p><form method=post action=/bookings/{}/action>{}<input type=hidden name=revision value={}>{}{}<button class=quiet name=action value=cancel>Cancel appointment</button></form></article>",
  e(&v(b,"title")),badge(&v(b,"status")),e(&v(b,"start_at")),e(&v(b,"end_at")),e(&v(b,"description")),v(b,"id"),csrf(user),v(b,"revision"),
  if supplier&&b["status"]=="requested"{"<button name=action value=accept>Accept request</button><button class=quiet name=action value=decline>Decline</button>"}else{""},
  if supplier&&b["status"]=="confirmed"{"<button name=action value=complete>Complete appointment</button>"}else{""})).collect()
}
pub async fn supplier_section(app:&App,user:&auth::User)->Result<String>{
 let profile:Value=sqlx::query_scalar("SELECT profile FROM resiro.users WHERE id=$1").bind(user.id).fetch_one(&app.db).await?;
 let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(b)||jsonb_build_object('property_address',p.address) FROM resiro.bookings b JOIN resiro.properties p ON p.id=b.property_id WHERE supplier_org=$1 ORDER BY start_at").bind(user.org_id).fetch_all(&app.db).await?;
 let jobs=profile["jobs"].as_array().into_iter().flatten().map(|j|format!("<article class=card><h3>{}</h3><p>{}</p><p>{}</p></article>",e(&v(j,"property_address")),e(&v(j,"client_name")),e(&v(j,"description")))).collect::<String>();
 Ok(format!("<section class=hero><div><div class=eyebrow>SUPPLIER WORKSPACE</div><h1>{}</h1><p>Your profile, work and appointment requests.</p></div></section>{}<details class=card><summary>Business profile</summary><form method=post action=/supplier/profile>{}{}{}{}<label><input type=checkbox name=accept_bookings {}> Accept booking requests and publish my business name</label><button>Save profile</button></form></details><h2>Booking requests</h2>{}<h2>Jobs</h2><details class=card><summary>Create job</summary><form method=post action=/supplier/jobs>{}{}{}<label>Work description<textarea name=description required></textarea></label><button>Create job</button></form></details>{jobs}",
  e(&user.name),inbox(app,user).await?,csrf(user),input("company_name","Business name",&user.name,"text"),input("phone","Phone",&v(&profile,"phone"),"tel"),input("specialties","Specialties",&v(&profile,"specialties"),"text"),if profile["accept_bookings"]==true{"checked"}else{""},booking_list(&rows,user,true),csrf(user),input("property_address","Property address","","text"),input("client_name","Client name","","text")))
}
pub async fn save_profile(State(app):State<App>,headers:HeaderMap,Form(data):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,data.get("csrf").map(String::as_str).unwrap_or(""))?;if user.role!="supplier"{return Err(missing());}
 let name=data.get("company_name").filter(|n|!n.trim().is_empty()).ok_or_else(||bad("Business name required"))?;
 sqlx::query("UPDATE resiro.users SET name=$1,profile=profile||$2 WHERE id=$3").bind(name).bind(json!({"phone":data.get("phone"),"specialties":data.get("specialties"),"accept_bookings":data.contains_key("accept_bookings")})).bind(user.id).execute(&app.db).await?;Ok(Redirect::to("/supplier"))
}
pub async fn add_job(State(app):State<App>,headers:HeaderMap,Form(data):Form<HashMap<String,String>>)->Result<Redirect>{
 let user=auth::user(&app,&headers).await?;auth::csrf(&user,data.get("csrf").map(String::as_str).unwrap_or(""))?;if user.role!="supplier"{return Err(missing());}
 let job=json!({"id":Uuid::new_v4(),"property_address":data.get("property_address"),"client_name":data.get("client_name"),"description":data.get("description"),"created_at":Utc::now()});
 sqlx::query("UPDATE resiro.users SET profile=jsonb_set(profile,'{jobs}',coalesce(profile->'jobs','[]')||$1) WHERE id=$2").bind(json!([job])).bind(user.id).execute(&app.db).await?;Ok(Redirect::to("/supplier"))
}
pub async fn notify_due(app:App){loop{
 let result:Result<()>=async{
  let mut tx=app.db.begin().await?;
  let rows:Vec<Value>=sqlx::query_scalar("UPDATE resiro.reminders AS due SET notified_due=due_at WHERE id IN(SELECT id FROM resiro.reminders WHERE status='open' AND due_at<=now() AND notified_due IS DISTINCT FROM due_at FOR UPDATE SKIP LOCKED LIMIT 100) RETURNING to_jsonb(due)").fetch_all(&mut *tx).await?;
  for r in rows{let org:Uuid=v(&r,"org_id").parse().unwrap();let key=format!("reminder:{}:{}",v(&r,"id"),v(&r,"due_at"));
   sqlx::query("INSERT INTO resiro.notifications(id,org_id,source_key,title,message,path) VALUES($1,$2,$3,'Reminder due',$4,$5) ON CONFLICT(source_key) DO NOTHING")
    .bind(Uuid::new_v4()).bind(org).bind(key).bind(v(&r,"title")).bind(format!("/properties/{}?tab=maintenance",v(&r,"property_id"))).execute(&mut *tx).await?;
  }tx.commit().await?;Ok(())
 }.await;
 if let Err(e)=result{tracing::warn!(error=%e,"Reminder notification sweep failed");}
 tokio::time::sleep(std::time::Duration::from_secs(20)).await;
}}
#[cfg(test)]mod tests{use super::*;#[test]fn south_africa_time(){assert_eq!(parse_time("2030-01-01T10:00").unwrap().hour(),8);}}
