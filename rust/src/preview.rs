use crate::{App, Result, Error, auth, bad, missing, storage};
use axum::{extract::{Path, State}, http::{HeaderMap, header}, response::{IntoResponse, Response}};
use uuid::Uuid;

static RENDERS: tokio::sync::Semaphore = tokio::sync::Semaphore::const_new(2);

pub async fn page_image(
    State(app): State<App>,
    headers: HeaderMap,
    Path((id, page)): Path<(Uuid, u32)>,
) -> Result<Response> {
    let user = auth::user(&app, &headers).await?;
    let (key, mime, sha): (String, String, String) = sqlx::query_as(
        "SELECT object_key,mime,sha256 FROM resiro.documents WHERE id=$1 AND org_id=$2",
    )
    .bind(id)
    .bind(user.org_id)
    .fetch_optional(&app.db)
    .await?
    .ok_or_else(missing)?;
    if page == 0 || !matches!(mime.as_str(), "application/pdf" | "image/png" | "image/jpeg") {
        return Err(missing());
    }
    let _permit = RENDERS.try_acquire().map_err(|_| bad("Preview is busy. Please refresh."))?;
    let bytes = app.store.get(&app.http, &key).await?;
    if storage::hash(&bytes) != sha {
        return Err(Error::Other(anyhow::anyhow!("Stored file checksum mismatch")));
    }
    if mime != "application/pdf" {
        return Ok(([(header::CONTENT_TYPE, mime)], bytes).into_response());
    }

    let dir = tempfile::tempdir().map_err(anyhow::Error::from)?;
    let source = dir.path().join("source.pdf");
    tokio::fs::write(&source, bytes).await.map_err(anyhow::Error::from)?;
    let page = page.to_string();
    let output = tokio::time::timeout(
        std::time::Duration::from_secs(25),
        tokio::process::Command::new("pdftoppm")
            .args(["-f", &page, "-l", &page, "-scale-to", "2200", "-singlefile", "-png"])
            .arg(source)
            .arg(dir.path().join("preview"))
            .kill_on_drop(true)
            .output(),
    ).await.map_err(|_| bad("Preview timed out"))?
        .map_err(anyhow::Error::from)?;
    if !output.status.success() {
        return Err(missing());
    }
    let png = tokio::fs::read(dir.path().join("preview.png")).await.map_err(|_| missing())?;
    Ok(([(header::CONTENT_TYPE, "image/png")], png).into_response())
}
