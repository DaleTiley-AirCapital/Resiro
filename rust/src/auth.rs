use crate::{App,Result,Error,bad};
use axum::{extract::{State,Form},http::{HeaderMap,StatusCode,header},response::{IntoResponse,Redirect,Response},Json};
use serde::{Serialize,Deserialize};
use std::collections::HashMap;
use rand::{Rng,distributions::Alphanumeric};
use uuid::Uuid;
use subtle::ConstantTimeEq;
#[derive(Clone,Serialize,sqlx::FromRow)]
pub struct User{pub id:Uuid,pub org_id:Uuid,pub email:String,pub name:String,pub role:String,#[serde(skip)]pub csrf:String}
pub fn random()->String{rand::thread_rng().sample_iter(&Alphanumeric).take(64).map(char::from).collect()}
pub fn safe_eq(a:&str,b:&str)->bool{crate::storage::hash(a.as_bytes()).as_bytes().ct_eq(crate::storage::hash(b.as_bytes()).as_bytes()).into()}
pub async fn bootstrap(app:&App)->anyhow::Result<()>{
 for (email,password) in [("dale.tiley@email.com","demo123"),("info@millenniumroofing.co.za","supplier123")]{
  let hash=bcrypt::hash(password,10)?;
  sqlx::query("UPDATE resiro.users SET password_hash=$1 WHERE email=$2").bind(hash).bind(email).execute(&app.db).await?;
 }
 if !app.private_email.is_empty(){
  let name=std::env::var("PRIVATE_OWNER_NAME").unwrap_or_else(|_|"Dale Tiley".into());
  sqlx::query("INSERT INTO resiro.users(id,org_id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5,'owner') ON CONFLICT(email) DO NOTHING")
   .bind(Uuid::new_v4()).bind(Uuid::new_v4()).bind(app.private_email.to_lowercase()).bind(name)
   .bind(bcrypt::hash(random(),12)?).execute(&app.db).await?;
 }Ok(())
}
pub fn import_ok(app:&App,headers:&HeaderMap)->bool{
 !app.import_token.is_empty()&&headers.get("x-resiro-import-token").and_then(|h|h.to_str().ok()).map(|v|safe_eq(v,&app.import_token)).unwrap_or(false)
}
pub async fn user(app:&App,headers:&HeaderMap)->Result<User>{
 if import_ok(app,headers){
  return sqlx::query_as::<_,User>("SELECT id,org_id,email,name,role,''::text csrf FROM resiro.users WHERE email=$1")
   .bind(app.private_email.to_lowercase()).fetch_optional(&app.db).await?.ok_or(crate::missing());
 }
 let bearer=headers.get(header::AUTHORIZATION).and_then(|v|v.to_str().ok()).and_then(|v|v.strip_prefix("Bearer "));
 let cookie=headers.get(header::COOKIE).and_then(|v|v.to_str().ok()).and_then(|v|v.split(';').find_map(|c|c.trim().strip_prefix("resiro_session=")));
 let token=bearer.or(cookie).ok_or_else(||Error::Message(StatusCode::UNAUTHORIZED,"Please sign in".into()))?;
 sqlx::query_as::<_,User>("SELECT u.id,u.org_id,u.email,u.name,u.role,s.csrf FROM resiro.sessions s JOIN resiro.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()")
  .bind(crate::storage::hash(token.as_bytes())).fetch_optional(&app.db).await?.ok_or_else(||Error::Message(StatusCode::UNAUTHORIZED,"Your session has expired. Please sign in.".into()))
}
pub fn csrf(user:&User,value:&str)->Result<()>{if safe_eq(&user.csrf,value)&&!user.csrf.is_empty(){Ok(())}else{Err(Error::Message(StatusCode::FORBIDDEN,"Refresh this page before saving.".into()))}}
pub fn api_csrf(app:&App,user:&User,headers:&HeaderMap,value:Option<&str>)->Result<()>{
 if import_ok(app,headers)||headers.get(header::AUTHORIZATION).is_some(){return Ok(());}
 csrf(user,value.or_else(||headers.get("x-csrf-token").and_then(|v|v.to_str().ok())).unwrap_or(""))
}
#[derive(Deserialize)]pub struct Login{email:String,password:String}
async fn credentials(app:&App,email:&str,password:&str)->Result<(User,String)>{
 let email=email.trim().to_lowercase();
 let record:Option<(Uuid,String)>=sqlx::query_as("SELECT id,password_hash FROM resiro.users WHERE email=$1").bind(&email).fetch_optional(&app.db).await?;
 let password=password.to_string();
 let (id,hash)=record.unwrap_or((Uuid::nil(),"$2b$10$W7/NKRBz8tQ1S1b6HtPSZeU9AjDCqG./97LNIGAwKLHQsVJG/IjeO".into()));
 let valid=tokio::task::spawn_blocking(move||bcrypt::verify(password, &hash).unwrap_or(false)).await.map_err(|e|anyhow::anyhow!(e))?;
 if !valid||id.is_nil(){return Err(Error::Message(StatusCode::UNAUTHORIZED,"Invalid email or password".into()));}
 let token=random();let csrf=random();
 sqlx::query("INSERT INTO resiro.sessions(token_hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '7 days')")
  .bind(crate::storage::hash(token.as_bytes())).bind(id).bind(&csrf).execute(&app.db).await?;
 let user=sqlx::query_as::<_,User>("SELECT id,org_id,email,name,role,$2::text csrf FROM resiro.users WHERE id=$1").bind(id).bind(csrf).fetch_one(&app.db).await?;
 Ok((user,token))
}
pub async fn login_form(State(app):State<App>,Form(form):Form<HashMap<String,String>>)->Result<Response>{
 let (user,token)=credentials(&app,form.get("email").map(String::as_str).unwrap_or(""),form.get("password").map(String::as_str).unwrap_or("")).await?;
 let destination=if user.role=="supplier"{"/supplier"}else{"/app"};
 let mut response=Redirect::to(destination).into_response();
 response.headers_mut().insert(header::SET_COOKIE,format!("resiro_session={token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800").parse().unwrap());
 response.headers_mut().insert(header::CACHE_CONTROL,"no-store".parse().unwrap());Ok(response)
}
pub async fn login_json(State(app):State<App>,Json(input):Json<Login>)->Result<Json<serde_json::Value>>{
 let (user,token)=credentials(&app,&input.email,&input.password).await?;
 Ok(Json(serde_json::json!({"user":user,"token":token,"csrf":user.csrf})))
}
pub async fn logout(State(app):State<App>,headers:HeaderMap,Form(form):Form<HashMap<String,String>>)->Result<Response>{
 let user=user(&app,&headers).await?;csrf(&user,form.get("csrf").map(String::as_str).unwrap_or(""))?;
 let token=headers.get(header::COOKIE).and_then(|v|v.to_str().ok()).and_then(|v|v.split(';').find_map(|c|c.trim().strip_prefix("resiro_session="))).unwrap_or("");
 sqlx::query("DELETE FROM resiro.sessions WHERE token_hash=$1").bind(crate::storage::hash(token.as_bytes())).execute(&app.db).await?;
 let mut response=Redirect::to("/login").into_response();response.headers_mut().insert(header::SET_COOKIE,"resiro_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict".parse().unwrap());Ok(response)
}
pub async fn issue_invite(State(app):State<App>,headers:HeaderMap)->Result<Json<serde_json::Value>>{
 if !import_ok(&app,&headers){return Err(crate::missing());}
 let user=user(&app,&headers).await?;let token=random();
 sqlx::query("INSERT INTO resiro.invites(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')")
  .bind(crate::storage::hash(token.as_bytes())).bind(user.id).execute(&app.db).await?;
 Ok(Json(serde_json::json!({"token":token,"email":user.email})))
}
pub async fn activate(State(app):State<App>,Form(form):Form<HashMap<String,String>>)->Result<Response>{
 let token=form.get("token").ok_or_else(||bad("Activation code required"))?;
 let password=form.get("password").ok_or_else(||bad("Password required"))?;
 if password.chars().count()<12||password.len()>72{return Err(bad("Choose a password of 12–72 characters"));}
 let mut tx=app.db.begin().await?;
 let id:Option<Uuid>=sqlx::query_scalar("UPDATE resiro.invites SET consumed_at=now() WHERE token_hash=$1 AND expires_at>now() AND consumed_at IS NULL RETURNING user_id")
  .bind(crate::storage::hash(token.as_bytes())).fetch_optional(&mut *tx).await?;
 let id=id.ok_or_else(||bad("This activation code is invalid or expired"))?;
 let password=password.to_owned();let hash=tokio::task::spawn_blocking(move||bcrypt::hash(password,12)).await.map_err(|e|anyhow::anyhow!(e))?.map_err(|e|anyhow::anyhow!(e))?;
 sqlx::query("UPDATE resiro.users SET password_hash=$1 WHERE id=$2").bind(hash).bind(id).execute(&mut *tx).await?;
 sqlx::query("DELETE FROM resiro.sessions WHERE user_id=$1").bind(id).execute(&mut *tx).await?;tx.commit().await?;
 Ok(Redirect::to("/login?activated=1").into_response())
}
