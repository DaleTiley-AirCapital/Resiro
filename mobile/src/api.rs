use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const BASE: &str = "https://resiro-web-production.up.railway.app";
#[derive(Clone, PartialEq, Deserialize, Serialize)]
pub struct Session { pub token: String, pub csrf: String, pub user: Value }
pub fn text(v: &Value, key: &str) -> String { v.get(key).and_then(Value::as_str).unwrap_or("").to_owned() }
async fn response(r: reqwest::Response) -> Result<Value,String> {
    let status=r.status(); let value=r.json::<Value>().await.map_err(|_| "The server returned an unreadable response.".to_string())?;
    if status.is_success() { Ok(value) } else { Err(value.get("error").and_then(Value::as_str).unwrap_or("Request failed. Please try again.").to_string()) }
}
pub async fn login(email: String,password: String) -> Result<Session,String> {
    let r=reqwest::Client::new().post(format!("{BASE}/api/session")).json(&serde_json::json!({"email":email,"password":password})).send().await.map_err(|_|"Unable to connect. Check your internet connection.".to_string())?;
    serde_json::from_value(response(r).await?).map_err(|_|"Unable to open this session.".to_string())
}
pub async fn get(s: &Session,path: &str) -> Result<Value,String> {
    let r=reqwest::Client::new().get(format!("{BASE}{path}")).bearer_auth(&s.token).send().await.map_err(|_|"Unable to connect. Please try again.".to_string())?;
    response(r).await
}
pub async fn post(s: &Session,path: &str,value: Value) -> Result<Value,String> {
    let r=reqwest::Client::new().post(format!("{BASE}{path}")).bearer_auth(&s.token).json(&value).send().await.map_err(|_|"Unable to connect. Please try again.".to_string())?;
    response(r).await
}
pub async fn upload(s: &Session,property: &str,name: String,bytes: Vec<u8>) -> Result<Value,String> {
    let part=reqwest::multipart::Part::bytes(bytes).file_name(name);
    let form=reqwest::multipart::Form::new().text("property_id",property.to_string()).text("source_root","Mobile uploads").text("source_path","").part("file",part);
    let r=reqwest::Client::new().post(format!("{BASE}/api/documents")).bearer_auth(&s.token).multipart(form).send().await.map_err(|_|"Upload interrupted. Please try again.".to_string())?;
    response(r).await
}
