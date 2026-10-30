using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RezDNA.API.Services;
using RezDNA.Data;
using System.Diagnostics;
using System.Text.Json.Nodes;

namespace RezDNA.API.Controllers;

[ApiController, Authorize]
public class AnalysisController : ControllerBase {
    private readonly RezDNADbContext db;private readonly AiAnalysisService ai;private readonly IWebHostEnvironment environment;
    public AnalysisController(RezDNADbContext db,AiAnalysisService ai,IWebHostEnvironment environment){this.db=db;this.ai=ai;this.environment=environment;}
    private Guid OrgId=>Guid.Parse(User.FindFirst("orgId")!.Value);
    private int DailyLimit=>OrgId==Guid.Parse("00000000-0000-0000-0000-000000000003")?5:20;
    [HttpGet("api/ai/status")]
    public async Task<IActionResult> Status() {
        var state=WorkflowState.Json((await db.Organizations.SingleAsync(o=>o.Id==OrgId)).Settings);
        var used=WorkflowState.List(state,"analysis_runs").Count(r=>DateTime.TryParse(r?["created_at"]?.ToString(),out var created)&&created.ToUniversalTime().Date==DateTime.UtcNow.Date);
        return Ok(new {configured=ai.Configured,model=ai.Model,daily_limit=DailyLimit,remaining=Math.Max(0,DailyLimit-used),
            supported_formats=new[]{"pdf","txt","md","csv","json"},max_documents=5});
    }
    [HttpGet("api/properties/{propertyId:guid}/analyses")]
    public async Task<IActionResult> Runs(Guid propertyId) {
        if(!await db.Properties.AnyAsync(p=>p.Id==propertyId && p.OrgId==OrgId))return NotFound();
        var state=WorkflowState.Json((await db.Organizations.SingleAsync(o=>o.Id==OrgId)).Settings);
        return Ok(WorkflowState.List(state,"analysis_runs").Where(r=>r?["property_id"]?.ToString()==propertyId.ToString()).Reverse().Take(20).ToArray());
    }
    private async Task<string> Extract(string path,string name,CancellationToken stop) {
        var extension=Path.GetExtension(name).ToLowerInvariant();
        if(new[]{".txt",".md",".csv",".json"}.Contains(extension)) {
            var text=await System.IO.File.ReadAllTextAsync(path,stop);
            if(text.Length>90000)throw new AnalysisFailure("too_large","Selected document text exceeds 90,000 characters");
            return text;
        }
        if(extension!=".pdf")throw new AnalysisFailure("unsupported_format","Choose a searchable PDF or a TXT, MD, CSV or JSON document");
        var info=new ProcessStartInfo("pdftotext"){RedirectStandardOutput=true,RedirectStandardError=true,UseShellExecute=false};
        foreach(var arg in new[]{"-layout","-enc","UTF-8",path,"-"})info.ArgumentList.Add(arg);
        using var process=Process.Start(info) ?? throw new AnalysisFailure("extraction_failed","PDF text extraction could not start");
        using var timeout=CancellationTokenSource.CreateLinkedTokenSource(stop);timeout.CancelAfter(TimeSpan.FromSeconds(25));
        try {
            var textTask=process.StandardOutput.ReadToEndAsync(timeout.Token);
            var errorTask=process.StandardError.ReadToEndAsync(timeout.Token);
            await process.WaitForExitAsync(timeout.Token);var text=await textTask;await errorTask;
            if(process.ExitCode!=0)throw new AnalysisFailure("extraction_failed","The PDF could not be read. Check that it is not encrypted.");
            if(text.Length>90000)throw new AnalysisFailure("too_large","Selected document text exceeds 90,000 characters");
            if(string.IsNullOrWhiteSpace(text))throw new AnalysisFailure("no_text","This PDF has no searchable text. Upload a searchable PDF or text document.");
            return text;
        } catch(OperationCanceledException) {if(!process.HasExited)process.Kill(true);if(stop.IsCancellationRequested)throw;throw new AnalysisFailure("extraction_timeout","PDF text extraction timed out. Try a smaller document.");}
    }
    [HttpPost("api/properties/{propertyId:guid}/analyses"), RequestSizeLimit(65536)]
    public async Task<IActionResult> Analyze(Guid propertyId,JsonObject input,CancellationToken stop) {
        if(!await db.Properties.AnyAsync(p=>p.Id==propertyId && p.OrgId==OrgId))return NotFound();
        if(input["consent"]?.ToString()!="true")return BadRequest(new {error="Confirm that selected document text may be sent to OpenAI"});
        if(input["document_ids"] is not JsonArray ids || ids.Count<1 || ids.Count>5 ||
            ids.Any(i=>!Guid.TryParse(i?.ToString(),out _)))return BadRequest(new {error="Select one to five documents"});
        var selected=ids.Select(i=>Guid.Parse(i!.ToString())).Distinct().ToArray();
        var documents=await db.Documents.Where(d=>d.OrgId==OrgId && d.PropertyId==propertyId && selected.Contains(d.Id)).ToListAsync();
        if(documents.Count!=selected.Length)return NotFound(new {error="One of the selected documents was not found"});
        if(!ai.Configured)return StatusCode(503,new {error="AI is not configured. Add OPENAI_API_KEY to this Railway service.",code="not_configured"});
        var sources=new List<AnalysisDocument>();
        try {
            if(documents.Sum(d=>d.Bytes)>20*1024*1024)return BadRequest(new {error="Selected files exceed 20 MB"});
            foreach(var doc in documents) {
                var path=Path.Combine(environment.ContentRootPath,"uploads",OrgId.ToString(),doc.Id.ToString());
                if(!System.IO.File.Exists(path))return UnprocessableEntity(new {error="A selected document's file is unavailable"});
                var text=await Extract(path,doc.Name,stop);
                if(string.IsNullOrWhiteSpace(text))return UnprocessableEntity(new {error="A selected document contains no readable text"});
                sources.Add(new AnalysisDocument(doc.Id.ToString(),doc.Name,text,doc.Sha256));
            }
            if(sources.Sum(d=>d.Text.Length)>90000)return BadRequest(new {error="Selected document text exceeds 90,000 characters"});
        }catch(AnalysisFailure ex){return UnprocessableEntity(new {error=ex.Message,code=ex.Code});}
        var runId=Guid.NewGuid().ToString();
        await using(var tx=await db.Database.BeginTransactionAsync(stop)) {
            var org=(await WorkflowState.Lock(db,OrgId))[OrgId];var state=WorkflowState.Json(org.Settings);var runs=WorkflowState.List(state,"analysis_runs");
            foreach(var old in runs.Where(r=>r?["status"]?.ToString()=="running"&&DateTime.TryParse(r?["created_at"]?.ToString(),out var date)&&date.ToUniversalTime()<DateTime.UtcNow.AddMinutes(-5))) {
                old!["status"]="failed";old["error"]="Analysis was interrupted. Start a new analysis.";
            }
            if(runs.Any(r=>r?["property_id"]?.ToString()==propertyId.ToString()&&r?["status"]?.ToString()=="running"))return Conflict(new {error="An analysis is already running for this property"});
            if(runs.Count(r=>DateTime.TryParse(r?["created_at"]?.ToString(),out var date)&&date.ToUniversalTime().Date==DateTime.UtcNow.Date)>=DailyLimit)
                return StatusCode(429,new {error="This account has reached its daily AI analysis limit"});
            runs.Add(new JsonObject {["id"]=runId,["property_id"]=propertyId.ToString(),["status"]="running",
                ["created_at"]=DateTime.UtcNow,["model"]=ai.Model,["prompt_version"]="property-review-v1",["review_status"]="needs_review",
                ["sources"]=new JsonArray(sources.Select(d=>(JsonNode?)new JsonObject {["id"]=d.Id,["name"]=d.Name,["sha256"]=d.Sha256}).ToArray())});
            org.Settings=state.ToJsonString();await db.SaveChangesAsync(stop);await tx.CommitAsync(stop);
        }
        JsonObject? result=null;string responseId="";string? error=null;string? code=null;
        try {
            using var timeout=CancellationTokenSource.CreateLinkedTokenSource(stop);timeout.CancelAfter(TimeSpan.FromSeconds(120));
            (result,responseId)=await ai.Analyze(sources,timeout.Token);
        }catch(AnalysisFailure ex){error=ex.Message;code=ex.Code;}
        catch(OperationCanceledException){error="Analysis timed out or was cancelled. No successful result was recorded.";code="timeout";}
        catch(Exception){error="AI analysis could not be completed. Try again later.";code="provider_error";}
        await using(var tx=await db.Database.BeginTransactionAsync()) {
            var org=(await WorkflowState.Lock(db,OrgId))[OrgId];await db.Entry(org).ReloadAsync();
            var state=WorkflowState.Json(org.Settings);var run=WorkflowState.List(state,"analysis_runs").First(r=>r?["id"]?.ToString()==runId)!;
            run["status"]=error==null?"completed":"failed";run["completed_at"]=DateTime.UtcNow;
            if(error!=null){run["error"]=error;run["error_code"]=code;}else{run["result"]=result;run["provider_response_id"]=responseId;}
            org.Settings=state.ToJsonString();await db.SaveChangesAsync();await tx.CommitAsync();
            return error==null?Ok(run.DeepClone()):StatusCode(502,new {error,code,run_id=runId});
        }
    }
    [HttpPatch("api/properties/{propertyId:guid}/analyses/{runId:guid}/review")]
    public async Task<IActionResult> Review(Guid propertyId,Guid runId,JsonObject input) {
        if(!await db.Properties.AnyAsync(p=>p.Id==propertyId && p.OrgId==OrgId))return NotFound();
        var review=WorkflowState.Text(input,"status");if(!new[]{"reviewed","rejected"}.Contains(review))return BadRequest();
        await using var tx=await db.Database.BeginTransactionAsync();var org=(await WorkflowState.Lock(db,OrgId))[OrgId];
        var state=WorkflowState.Json(org.Settings);var run=WorkflowState.List(state,"analysis_runs")
            .FirstOrDefault(r=>r?["id"]?.ToString()==runId.ToString()&&r?["property_id"]?.ToString()==propertyId.ToString());
        if(run==null || run["status"]?.ToString()!="completed")return NotFound();
        run["review_status"]=review;run["reviewed_at"]=DateTime.UtcNow;run["reviewed_by"]=User.FindFirst("userId")?.Value;
        run["review_note"]=WorkflowState.Text(input,"note");org.Settings=state.ToJsonString();
        await db.SaveChangesAsync();await tx.CommitAsync();return Ok(run.DeepClone());
    }
}
