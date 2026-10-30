use rusty_s3::{Bucket,Credentials,UrlStyle,S3Action};
use std::{env,time::Duration};
use sha2::{Sha256,Digest};
pub struct ObjectStore {pub bucket:Bucket,credentials:Credentials}
impl ObjectStore {
 pub fn from_env()->anyhow::Result<Self>{
  let style=if env::var("S3_URL_STYLE").unwrap_or_default()=="virtual-host"{UrlStyle::VirtualHost}else{UrlStyle::Path};
  Ok(Self{bucket:Bucket::new(env::var("S3_ENDPOINT")?.parse()?,style,env::var("S3_BUCKET")?,env::var("S3_REGION")?)?,
   credentials:Credentials::new(env::var("S3_ACCESS_KEY_ID")?,env::var("S3_SECRET_ACCESS_KEY")?)})
 }
 pub async fn put(&self,http:&reqwest::Client,key:&str,data:Vec<u8>)->anyhow::Result<()>{
  let url=self.bucket.put_object(Some(&self.credentials),key).sign(Duration::from_secs(300));
  let response=http.put(url).body(data).send().await?;
  if !response.status().is_success(){anyhow::bail!("Object storage rejected upload with {}",response.status());}Ok(())
 }
 pub async fn get(&self,http:&reqwest::Client,key:&str)->anyhow::Result<Vec<u8>>{
  let url=self.bucket.get_object(Some(&self.credentials),key).sign(Duration::from_secs(300));
  let response=http.get(url).send().await?;
  if !response.status().is_success(){anyhow::bail!("Object storage rejected retrieval with {}",response.status());}
  Ok(response.bytes().await?.to_vec())
 }
}
pub fn hash(bytes:&[u8])->String{hex::encode(Sha256::digest(bytes))}
pub fn excluded(name:&str)->bool {
 let ext=name.rsplit('.').next().unwrap_or("").to_lowercase();
 ["dwg","dxf","skp","skb","bak","dwl","dwl2","tjb","pmrjb","cdc","log","err"].contains(&ext.as_str())
}
#[cfg(test)]mod tests{use super::*;#[test]fn drawings_never_uploaded(){for n in ["plan.DWG","floor.dxf","backup.bak","roof.pmrjb"]{assert!(excluded(n));}assert!(!excluded("Approved plans.pdf"));assert!(!excluded("Receipt.xlsx"));}}
