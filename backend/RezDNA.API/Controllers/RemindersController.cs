using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RezDNA.API.Services;
using RezDNA.Data;
using RezDNA.Models.Entities;
using System.Text.Json.Nodes;

namespace RezDNA.API.Controllers;

[ApiController, Authorize]
public class RemindersController : ControllerBase {
    private readonly RezDNADbContext db;
    public RemindersController(RezDNADbContext db) { this.db=db; }
    private Guid OrgId => Guid.Parse(User.FindFirst("orgId")!.Value);
    [HttpGet("api/properties/{propertyId:guid}/reminders")]
    public async Task<IActionResult> List(Guid propertyId) {
        if(!await db.Properties.AnyAsync(p=>p.Id==propertyId && p.OrgId==OrgId)) return NotFound();
        var rows=await db.MaintenanceItems.Where(m=>m.PropertyId==propertyId && m.OrgId==OrgId).OrderBy(m=>m.NextDue).ToListAsync();
        return Ok(rows.Where(m=>WorkflowState.Meta(m)["record_type"]?.ToString()=="reminder").Select(WorkflowState.Reminder));
    }
    [HttpPost("api/properties/{propertyId:guid}/reminders"), RequestSizeLimit(65536)]
    public async Task<IActionResult> Create(Guid propertyId, JsonObject input) {
        if(!await db.Properties.AnyAsync(p=>p.Id==propertyId && p.OrgId==OrgId)) return NotFound();
        var title=WorkflowState.Text(input,"title",200);
        if(title.Length==0 || !WorkflowState.Time(input,"due_at",out var due)) return BadRequest(new {error="Title and due date with timezone are required"});
        var recurrence=WorkflowState.Text(input,"recurrence");
        if(!new[]{"none","daily","weekly","monthly"}.Contains(recurrence)) return BadRequest(new {error="Choose a supported recurrence"});
        var item=new MaintenanceItem {OrgId=OrgId,PropertyId=propertyId,Title=title,
            Description=WorkflowState.Text(input,"description"),NextDue=due,Frequency=recurrence,
            Priority=WorkflowState.Text(input,"priority",30),
            Metadata=new JsonObject {["record_type"]="reminder",["status"]="open",["revision"]=1}.ToJsonString()};
        db.MaintenanceItems.Add(item); await db.SaveChangesAsync();
        return Ok(WorkflowState.Reminder(item));
    }
    [HttpPatch("api/reminders/{id:guid}"), RequestSizeLimit(65536)]
    public async Task<IActionResult> Update(Guid id, JsonObject input) {
        await using var transaction=await db.Database.BeginTransactionAsync();
        await WorkflowState.Lock(db,OrgId);
        var item=await db.MaintenanceItems.SingleOrDefaultAsync(m=>m.Id==id && m.OrgId==OrgId);
        if(item==null || WorkflowState.Meta(item)["record_type"]?.ToString()!="reminder") return NotFound();
        var meta=WorkflowState.Meta(item); var revision=meta["revision"]?.GetValue<int>() ?? 1;
        if(!int.TryParse(input["revision"]?.ToString(),out var expected) || expected!=revision) return Conflict(new {error="This reminder changed. Refresh and try again."});
        var action=WorkflowState.Text(input,"action");
        if(action=="complete") {
            meta["completed_at"]=DateTime.UtcNow; meta["status"]="completed";
            if(item.Frequency is "daily" or "weekly" or "monthly") {
                var next=item.NextDue ?? DateTime.UtcNow;
                do { next=item.Frequency=="daily"?next.AddDays(1):item.Frequency=="weekly"?next.AddDays(7):next.AddMonths(1); } while(next<=DateTime.UtcNow);
                item.NextDue=next; meta["status"]="open";
            }
        } else if(action=="reschedule") {
            if(!WorkflowState.Time(input,"due_at",out var due)) return BadRequest(new {error="A due date with timezone is required"});
            item.NextDue=due; meta["status"]="open";
        } else if(action=="cancel") meta["status"]="cancelled";
        else return BadRequest(new {error="Unknown reminder action"});
        meta["revision"]=revision+1; meta.Remove("notified_due"); item.Metadata=meta.ToJsonString(); item.UpdatedAt=DateTime.UtcNow;
        await db.SaveChangesAsync(); await transaction.CommitAsync(); return Ok(WorkflowState.Reminder(item));
    }
    [HttpGet("api/notifications")]
    public async Task<IActionResult> Notifications() {
        var state=WorkflowState.Json((await db.Organizations.SingleAsync(o=>o.Id==OrgId)).Settings);
        var notices=WorkflowState.List(state,"notifications");
        return Ok(new {unread=notices.Count(n=>n?["read"]?.GetValue<bool>()!=true),items=notices.Reverse().Take(100).ToArray()});
    }
    [HttpPatch("api/notifications/{id:guid}")]
    public async Task<IActionResult> Read(Guid id) {
        await using var transaction=await db.Database.BeginTransactionAsync();
        var org=(await WorkflowState.Lock(db,OrgId))[OrgId]; var state=WorkflowState.Json(org.Settings);
        var notice=WorkflowState.List(state,"notifications").FirstOrDefault(n=>n?["id"]?.ToString()==id.ToString());
        if(notice==null)return NotFound(); notice["read"]=true; org.Settings=state.ToJsonString();
        await db.SaveChangesAsync(); await transaction.CommitAsync(); return Ok(new {read=true});
    }
}
