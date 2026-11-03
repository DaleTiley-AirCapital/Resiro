pub async fn maintenance_json(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>)->Result<axum::Json<Value>>{
 let user=auth::user(&app,&headers).await?;property(&app,&user,id).await?;
 let reminders:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(r) FROM resiro.reminders r WHERE property_id=$1 AND org_id=$2 ORDER BY due_at").bind(id).bind(user.org_id).fetch_all(&app.db).await?;
 let bookings:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(b) FROM resiro.bookings b WHERE property_id=$1 AND owner_org=$2 ORDER BY start_at").bind(id).bind(user.org_id).fetch_all(&app.db).await?;
 let suppliers:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('org_id',org_id,'name',name) FROM resiro.users WHERE role='supplier' AND org_id<>$1 AND coalesce((profile->>'accept_bookings')::boolean,false)=true AND ($2='dale.tiley@email.com' OR email<>'info@millenniumroofing.co.za')").bind(user.org_id).bind(&user.email).fetch_all(&app.db).await?;
 Ok(axum::Json(json!({"reminders":reminders,"bookings":bookings,"suppliers":suppliers})))
}
pub async fn supplier_json(State(app):State<App>,headers:HeaderMap)->Result<axum::Json<Value>>{
 let user=auth::user(&app,&headers).await?;if user.role!="supplier"{return Err(missing());}
 let profile:Value=sqlx::query_scalar("SELECT profile FROM resiro.users WHERE id=$1").bind(user.id).fetch_one(&app.db).await?;
 let bookings:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(b)||jsonb_build_object('address',p.address) FROM resiro.bookings b JOIN resiro.properties p ON p.id=b.property_id WHERE supplier_org=$1 ORDER BY start_at").bind(user.org_id).fetch_all(&app.db).await?;
 Ok(axum::Json(json!({"name":user.name,"profile":profile,"bookings":bookings})))
}

pub async fn add_reminder_json(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,axum::Json(mut data):axum::Json<HashMap<String,String>>)->Result<axum::Json<Value>>{
 let user=auth::user(&app,&headers).await?;auth::api_csrf(&app,&user,&headers,data.get("csrf").map(String::as_str))?;
 data.insert("csrf".into(),user.csrf);let _ = add_reminder(State(app),headers,Path(id),Form(data)).await?;
 Ok(axum::Json(json!({"saved":true})))
}

pub async fn reminder_action_json(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,axum::Json(mut data):axum::Json<HashMap<String,String>>)->Result<axum::Json<Value>>{
 let user=auth::user(&app,&headers).await?;auth::api_csrf(&app,&user,&headers,data.get("csrf").map(String::as_str))?;
 data.insert("csrf".into(),user.csrf);let _ = reminder_action(State(app),headers,Path(id),Form(data)).await?;
 Ok(axum::Json(json!({"saved":true})))
}

pub async fn add_booking_json(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,axum::Json(mut data):axum::Json<HashMap<String,String>>)->Result<axum::Json<Value>>{
 let user=auth::user(&app,&headers).await?;auth::api_csrf(&app,&user,&headers,data.get("csrf").map(String::as_str))?;
 data.insert("csrf".into(),user.csrf);let _ = add_booking(State(app),headers,Path(id),Form(data)).await?;
 Ok(axum::Json(json!({"saved":true})))
}

pub async fn booking_action_json(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,axum::Json(mut data):axum::Json<HashMap<String,String>>)->Result<axum::Json<Value>>{
 let user=auth::user(&app,&headers).await?;auth::api_csrf(&app,&user,&headers,data.get("csrf").map(String::as_str))?;
 data.insert("csrf".into(),user.csrf);let _ = booking_action(State(app),headers,Path(id),Form(data)).await?;
 Ok(axum::Json(json!({"saved":true})))
}

pub async fn read_notice_json(State(app):State<App>,headers:HeaderMap,Path(id):Path<Uuid>,axum::Json(mut data):axum::Json<HashMap<String,String>>)->Result<axum::Json<Value>>{
 let user=auth::user(&app,&headers).await?;auth::api_csrf(&app,&user,&headers,data.get("csrf").map(String::as_str))?;
 data.insert("csrf".into(),user.csrf);let _ = read_notice(State(app),headers,Path(id),Form(data)).await?;
 Ok(axum::Json(json!({"saved":true})))
}

pub async fn save_profile_json(State(app):State<App>,headers:HeaderMap,axum::Json(mut data):axum::Json<HashMap<String,String>>)->Result<axum::Json<Value>>{
 let user=auth::user(&app,&headers).await?;auth::api_csrf(&app,&user,&headers,data.get("csrf").map(String::as_str))?;
 data.insert("csrf".into(),user.csrf);if data.get("accept_bookings").map(String::as_str)==Some("false"){data.remove("accept_bookings");}
 let _ = save_profile(State(app),headers,Form(data)).await?;Ok(axum::Json(json!({"saved":true})))
}

pub async fn add_job_json(State(app):State<App>,headers:HeaderMap,axum::Json(mut data):axum::Json<HashMap<String,String>>)->Result<axum::Json<Value>>{
 let user=auth::user(&app,&headers).await?;auth::api_csrf(&app,&user,&headers,data.get("csrf").map(String::as_str))?;
 data.insert("csrf".into(),user.csrf);if data.get("accept_bookings").map(String::as_str)==Some("false"){data.remove("accept_bookings");}
 let _ = add_job(State(app),headers,Form(data)).await?;Ok(axum::Json(json!({"saved":true})))
}
