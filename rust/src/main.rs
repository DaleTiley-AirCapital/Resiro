mod auth;
mod storage;
mod documents;
mod worker;
mod ai;
mod pages;
mod workflows;

use axum::{Router,routing::{get,post},extract::DefaultBodyLimit,http::StatusCode,response::{IntoResponse,Response}};
use serde_json::{json,Value};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tracing_subscriber::EnvFilter;

#[derive(Clone)]
pub struct App {
 pub db:sqlx::PgPool,pub http:reqwest::Client,pub store:Arc<storage::ObjectStore>,
 pub ai_key:String,pub model:String,pub import_token:String,pub private_email:String
}
#[derive(Debug,thiserror::Error)]
pub enum Error {
 #[error("{0}")] Message(StatusCode,String),
 #[error("Database operation failed")] Database(#[from]sqlx::Error),
 #[error("Storage or processing operation failed")] Other(#[from]anyhow::Error)
}
pub type Result<T> = std::result::Result<T,Error>;
impl IntoResponse for Error {
 fn into_response(self)->Response{
  let (status,message)=match self {Self::Message(s,m)=>(s,m),e=>{tracing::error!(error=%e,"Request failed");(StatusCode::INTERNAL_SERVER_ERROR,"The request could not be completed. Please try again.".into())}};
  (status,axum::Json(json!({"error":message}))).into_response()
 }
}
pub fn bad(message:&str)->Error{Error::Message(StatusCode::BAD_REQUEST,message.into())}
pub fn missing()->Error{Error::Message(StatusCode::NOT_FOUND,"Record not found".into())}
pub async fn property(app:&App,user:&auth::User,id:uuid::Uuid)->Result<Value>{
 let value:Option<Value>=sqlx::query_scalar("SELECT to_jsonb(p) FROM resiro.properties p WHERE id=$1 AND org_id=$2")
  .bind(id).bind(user.org_id).fetch_optional(&app.db).await?;
 value.ok_or_else(missing)
}
pub async fn event(app:&App,user:&auth::User,id:Option<uuid::Uuid>,kind:&str,title:&str,data:Value)->Result<()>{
 sqlx::query("INSERT INTO resiro.events(id,property_id,org_id,kind,title,data) VALUES($1,$2,$3,$4,$5,$6)")
  .bind(uuid::Uuid::new_v4()).bind(id).bind(user.org_id).bind(kind).bind(title).bind(data).execute(&app.db).await?;Ok(())
}
#[tokio::main]
async fn main()->anyhow::Result<()>{
 tracing_subscriber::fmt().with_env_filter(EnvFilter::new("resiro=info,tower_http=warn")).init();
 let db=PgPoolOptions::new().max_connections(12).connect(&std::env::var("DATABASE_URL")?).await?;
 sqlx::migrate!("./migrations").run(&db).await?;
 let state=App{db,http:reqwest::Client::builder().timeout(std::time::Duration::from_secs(150)).build()?,
  store:Arc::new(storage::ObjectStore::from_env()?),ai_key:std::env::var("OPENAI_API_KEY").unwrap_or_default(),
  model:std::env::var("OPENAI_MODEL").unwrap_or("gpt-4.1".into()),
  import_token:std::env::var("IMPORT_TOKEN").unwrap_or_default(),
  private_email:std::env::var("PRIVATE_OWNER_EMAIL").unwrap_or_default()};
 auth::bootstrap(&state).await?;
 tokio::spawn(worker::run(state.clone()));
 tokio::spawn(workflows::notify_due(state.clone()));
 let app=Router::new()
  .route("/",get(pages::marketing))
  .route("/favicon.ico",get(||async{axum::response::Redirect::permanent("/public/logo.png")}))
  .route("/health",get(||async{axum::Json(json!({"status":"ready","runtime":"rust","version":"2.0"}))}))
  .route("/login",get(pages::login).post(auth::login_form))
  .route("/api/session",post(auth::login_json).layer(DefaultBodyLimit::max(8192)))
  .route("/api/session/logout",post(auth::logout_json))
  .route("/logout",post(auth::logout))
  .route("/activate",get(pages::activate).post(auth::activate))
  .route("/app",get(pages::dashboard))
  .route("/supplier",get(pages::supplier))
  .route("/supplier/dashboard",get(pages::supplier))
  .route("/properties/new",get(pages::new_property).post(pages::create_property))
  .route("/properties/{id}",get(pages::property_page).post(pages::save_property))
  .route("/properties/{id}/ask",post(ai::ask_form))
  .route("/api/properties",get(pages::properties_json))
  .route("/api/properties/{id}",get(pages::property_json))
  .route("/api/properties/{id}/documents",get(documents::list))
  .route("/api/properties/{id}/facts",get(documents::facts))
  .route("/api/properties/{id}/assets",get(pages::assets_json))
  .route("/api/properties/{id}/activity",get(pages::activity_json))
  .route("/api/documents/{id}/text",get(documents::text_json))
  .route("/api/properties/{id}/search",get(documents::search))
  .route("/api/properties/{id}/ask",post(ai::ask_json))
  .route("/api/house/import",post(documents::create_house))
  .route("/api/house/invite",post(auth::issue_invite))
  .route("/api/house/manifest",post(documents::save_manifest))
  .route("/api/documents",post(documents::upload))
  .route("/documents/{id}",get(pages::document_page).post(documents::edit_form))
  .route("/documents/{id}/download",get(documents::download))
  .route("/documents/{id}/retry",post(documents::retry))
  .route("/facts/{id}/review",post(documents::review_fact))
  .route("/properties/{id}/assets",post(pages::save_asset))
  .merge(workflows::routes())
  .nest_service("/assets",tower_http::services::ServeDir::new("/app/marketing/assets"))
  .nest_service("/public",tower_http::services::ServeDir::new("/app/public"))
  .layer(DefaultBodyLimit::max(100*1024*1024)).layer(axum::middleware::from_fn(security_headers))
  .with_state(state);
 let address=format!("0.0.0.0:{}",std::env::var("PORT").unwrap_or("8080".into()));
 tracing::info!("Resiro Rust server ready");axum::serve(tokio::net::TcpListener::bind(address).await?,app).await?;Ok(())
}

async fn security_headers(request:axum::extract::Request,next:axum::middleware::Next)->Response{
 let path=request.uri().path();let private=path!="/"&&!path.starts_with("/assets/")&&!path.starts_with("/public/")&&path!="/favicon.ico"&&path!="/health";
 let mut response=next.run(request).await;
 response.headers_mut().insert("x-content-type-options",axum::http::HeaderValue::from_static("nosniff"));
 response.headers_mut().insert("referrer-policy",axum::http::HeaderValue::from_static("no-referrer"));
 response.headers_mut().insert("x-frame-options",axum::http::HeaderValue::from_static("DENY"));
 if private{
  response.headers_mut().insert("cache-control",axum::http::HeaderValue::from_static("no-store"));
  response.headers_mut().insert("content-security-policy",axum::http::HeaderValue::from_static("default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"));
 }
 response
}
