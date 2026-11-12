using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RezDNA.API.Services;
using RezDNA.Data;
using RezDNA.Models.Entities;
using RezDNA.Models.Enums;
using System.Text.Json.Nodes;
using System.Text;

namespace RezDNA.API.Controllers;

[ApiController, Authorize]
public class BookingsController : ControllerBase {
    private readonly RezDNADbContext db;
    private static readonly Guid DemoSupplier=Guid.Parse("00000000-0000-0000-0000-000000000004");
    public BookingsController(RezDNADbContext db){this.db=db;}
    private Guid OrgId=>Guid.Parse(User.FindFirst("orgId")!.Value);
    private static JsonObject Settings(Organization org)=>WorkflowState.Json(org.Settings)["booking_settings"]?.AsObject() ?? new();
    private static bool Published(Organization org)=>WorkflowState.Json(org.Settings)["supplier_profile"]?["accept_bookings"]?.GetValue<bool>() ?? org.Id==DemoSupplier;
    private static int Hour(JsonObject settings,string name,int fallback)=>settings[name]?.GetValue<int>() ?? fallback;
    private static bool Fits(Organization org,DateTime start,DateTime end) {
        var settings=Settings(org);var local=start.AddHours(2);var localEnd=end.AddHours(2);
        var days=settings["weekdays"] as JsonArray;
        var day=(int)local.DayOfWeek;
        var allowed=days==null ? day>=1&&day<=5 : days.Any(d=>d?.GetValue<int>()==day);
        return Published(org) && start>DateTime.UtcNow.AddMinutes(5) && start<DateTime.UtcNow.AddDays(180) &&
            allowed && local.Date==localEnd.Date && local.TimeOfDay>=TimeSpan.FromHours(Hour(settings,"open_hour",8)) &&
            localEnd.TimeOfDay<=TimeSpan.FromHours(Hour(settings,"close_hour",17)) &&
            local.Minute%30==0 && local.Second==0 && (end-start).TotalMinutes is >=30 and <=240;
    }
    private static bool Overlaps(MaintenanceItem item,DateTime start,DateTime end,Guid? exclude=null) {
        if(item.Id==exclude)return false;var meta=WorkflowState.Meta(item);
        return meta["record_type"]?.ToString()=="booking" && meta["status"]?.ToString()=="confirmed" &&
            WorkflowState.Time(meta,"start_at",out var otherStart) && WorkflowState.Time(meta,"end_at",out var otherEnd) &&
            start<otherEnd && end>otherStart;
    }
    private async Task<List<MaintenanceItem>> SupplierRows(Guid supplierOrg) {
        var users=await db.Users.Where(u=>u.OrgId==supplierOrg && u.UserType==UserType.Supplier).Select(u=>u.Id).ToListAsync();
        return await db.MaintenanceItems.Where(m=>m.AssignedTo!=null && users.Contains(m.AssignedTo.Value)).ToListAsync();
    }
    [HttpGet("api/suppliers")]
    public async Task<IActionResult> Suppliers() {
        var orgIds=await db.Users.Where(u=>u.UserType==UserType.Supplier).Select(u=>u.OrgId).Distinct().ToListAsync();
        var orgs=await db.Organizations.Where(o=>orgIds.Contains(o.Id)).ToListAsync();
        return Ok(orgs.Where(Published).Where(o=>o.Id!=OrgId).Select(o=>{
            var state=WorkflowState.Json(o.Settings);var profile=state["supplier_profile"];
            return new {id=o.Id,name=profile?["company_name"]?.ToString() ?? o.Name,
                specialties=profile?["specialties"]?.DeepClone() ?? new JsonArray(),
                timezone="Africa/Johannesburg",demo=o.Id==DemoSupplier};
        }));
    }
    [HttpGet("api/suppliers/{supplierOrg:guid}/availability")]
    public async Task<IActionResult> Availability(Guid supplierOrg,[FromQuery]string date,[FromQuery]int duration=60) {
        if(duration<30 || duration>240 || duration%30!=0 || !DateOnly.TryParseExact(date,"yyyy-MM-dd",out var day))
            return BadRequest(new {error="Choose a date and a duration of 30–240 minutes in 30-minute steps"});
        var org=await db.Organizations.SingleOrDefaultAsync(o=>o.Id==supplierOrg);
        if(org==null || !Published(org))return NotFound();
        var rows=await SupplierRows(supplierOrg);var settings=Settings(org);var slots=new List<object>();
        var start=DateTime.SpecifyKind(day.ToDateTime(new TimeOnly(Hour(settings,"open_hour",8),0)).AddHours(-2),DateTimeKind.Utc);
        for(var time=start;time<start.AddHours(24);time=time.AddMinutes(30)) {
            var end=time.AddMinutes(duration);
            if(Fits(org,time,end) && !rows.Any(r=>Overlaps(r,time,end)))slots.Add(new {start_at=time,end_at=end});
        }
        return Ok(new {timezone="Africa/Johannesburg",slots});
    }
    [HttpGet("api/supplier/booking-settings"), Authorize(Policy="Supplier")]
    public async Task<IActionResult> GetSettings()=>Ok(Settings(await db.Organizations.SingleAsync(o=>o.Id==OrgId)));
    [HttpPut("api/supplier/booking-settings"), Authorize(Policy="Supplier")]
    public async Task<IActionResult> SaveSettings(JsonObject input) {
        if(!int.TryParse(input["open_hour"]?.ToString(),out var open) || !int.TryParse(input["close_hour"]?.ToString(),out var close) ||
            open<0 || close>23 || open>=close || input["weekdays"] is not JsonArray days ||
            days.Count==0 || days.Any(d=>!int.TryParse(d?.ToString(),out var value)||value<0||value>6))
            return BadRequest(new {error="Choose working days and opening/closing hours"});
        await using var tx=await db.Database.BeginTransactionAsync();var org=(await WorkflowState.Lock(db,OrgId))[OrgId];
        var state=WorkflowState.Json(org.Settings);state["booking_settings"]=new JsonObject {
            ["open_hour"]=open,["close_hour"]=close,["weekdays"]=days.DeepClone(),["timezone"]="Africa/Johannesburg"};
        org.Settings=state.ToJsonString();await db.SaveChangesAsync();await tx.CommitAsync();return Ok(state["booking_settings"]!.DeepClone());
    }
    [HttpGet("api/properties/{propertyId:guid}/bookings")]
    public async Task<IActionResult> OwnerBookings(Guid propertyId) {
        if(!await db.Properties.AnyAsync(p=>p.Id==propertyId && p.OrgId==OrgId))return NotFound();
        var rows=await db.MaintenanceItems.Where(m=>m.PropertyId==propertyId && m.OrgId==OrgId).ToListAsync();
        return Ok(rows.Where(m=>WorkflowState.Meta(m)["record_type"]?.ToString()=="booking").Select(WorkflowState.Booking));
    }
    [HttpGet("api/supplier/bookings"), Authorize(Policy="Supplier")]
    public async Task<IActionResult> SupplierBookings()=>Ok((await SupplierRows(OrgId))
        .Where(m=>WorkflowState.Meta(m)["record_type"]?.ToString()=="booking").Select(WorkflowState.Booking));
    [HttpPost("api/properties/{propertyId:guid}/bookings"), RequestSizeLimit(65536)]
    public async Task<IActionResult> CreateBooking(Guid propertyId,JsonObject input) {
        var property=await db.Properties.SingleOrDefaultAsync(p=>p.Id==propertyId && p.OrgId==OrgId);
        if(property==null)return NotFound();
        var title=WorkflowState.Text(input,"title",200);
        if(title.Length==0 || !Guid.TryParse(input["supplier_org_id"]?.ToString(),out var supplierOrg) ||
            supplierOrg==OrgId || !WorkflowState.Time(input,"start_at",out var start) || !WorkflowState.Time(input,"end_at",out var end))
            return BadRequest(new {error="Choose a supplier, service, and appointment slot"});
        var supplier=await db.Users.Where(u=>u.OrgId==supplierOrg && u.UserType==UserType.Supplier).OrderBy(u=>u.CreatedAt).FirstOrDefaultAsync();
        if(supplier==null)return NotFound();
        await using var tx=await db.Database.BeginTransactionAsync();
        var orgs=await WorkflowState.Lock(db,OrgId,supplierOrg);var owner=orgs[OrgId];var provider=orgs[supplierOrg];
        if(!Fits(provider,start,end))return BadRequest(new {error="This time is outside the supplier's availability"});
        var existing=await SupplierRows(supplierOrg);
        if(existing.Any(r=>Overlaps(r,start,end)))return Conflict(new {error="This appointment slot has already been booked"});
        if(existing.Any(r=>r.OrgId==OrgId && r.PropertyId==propertyId && WorkflowState.Meta(r)["status"]?.ToString()=="requested" &&
            WorkflowState.Time(WorkflowState.Meta(r),"start_at",out var requested) && requested==start))
            return Conflict(new {error="You already requested this appointment"});
        var id=Guid.NewGuid();var supplierName=WorkflowState.Json(provider.Settings)["supplier_profile"]?["company_name"]?.ToString() ?? provider.Name;
        var meta=new JsonObject {["record_type"]="booking",["status"]="requested",["revision"]=1,
            ["supplier_org_id"]=supplierOrg.ToString(),["supplier_name"]=supplierName,["owner_name"]=owner.Name,
            ["property_address"]=property.Address ?? property.Name,["start_at"]=start,["end_at"]=end,
            ["events"]=new JsonArray(new JsonObject {["status"]="requested",["at"]=DateTime.UtcNow})};
        var item=new MaintenanceItem{Id=id,OrgId=OrgId,PropertyId=propertyId,AssignedTo=supplier.Id,Title=title,
            Description=WorkflowState.Text(input,"description"),Metadata=meta.ToJsonString()};
        db.MaintenanceItems.Add(item);
        WorkflowState.Notify(provider,id+":requested:1","New booking request",title+" — "+property.Address,"/supplier");
        WorkflowState.Notify(owner,id+":requested:1","Booking requested","Waiting for "+supplierName+" to confirm.","/properties/"+propertyId);
        await db.SaveChangesAsync();await tx.CommitAsync();return Ok(WorkflowState.Booking(item));
    }
    [HttpPatch("api/bookings/{id:guid}"), RequestSizeLimit(65536)]
    public async Task<IActionResult> Update(Guid id,JsonObject input) {
        var initial=await db.MaintenanceItems.AsNoTracking().SingleOrDefaultAsync(m=>m.Id==id);
        if(initial==null || WorkflowState.Meta(initial)["record_type"]?.ToString()!="booking")return NotFound();
        var initialMeta=WorkflowState.Meta(initial);
        if(!Guid.TryParse(initialMeta["supplier_org_id"]?.ToString(),out var supplierOrg))return NotFound();
        var isOwner=initial.OrgId==OrgId;var isSupplier=supplierOrg==OrgId && User.FindFirst("userType")?.Value=="supplier";
        if(!isOwner && !isSupplier)return NotFound();
        await using var tx=await db.Database.BeginTransactionAsync();var orgs=await WorkflowState.Lock(db,initial.OrgId,supplierOrg);
        var item=await db.MaintenanceItems.SingleAsync(m=>m.Id==id);var meta=WorkflowState.Meta(item);
        var revision=meta["revision"]?.GetValue<int>() ?? 1;
        if(!int.TryParse(input["revision"]?.ToString(),out var expected)||expected!=revision)return Conflict(new {error="This booking changed. Refresh and try again."});
        var action=WorkflowState.Text(input,"action");var status=meta["status"]?.ToString();
        if(action=="accept" && isSupplier && status=="requested") {
            if(!WorkflowState.Time(meta,"start_at",out var start)||!WorkflowState.Time(meta,"end_at",out var end)||!Fits(orgs[supplierOrg],start,end))
                return BadRequest(new {error="The requested time is no longer available"});
            if((await SupplierRows(supplierOrg)).Any(r=>Overlaps(r,start,end,id)))return Conflict(new {error="You already have an appointment at this time"});
            meta["status"]="confirmed";item.NextDue=start.AddHours(-1);
        } else if(action=="decline" && isSupplier && status=="requested") {meta["status"]="declined";item.NextDue=null;}
        else if(action=="cancel" && (isOwner || isSupplier) && status is "requested" or "confirmed") {meta["status"]="cancelled";item.NextDue=null;}
        else if(action=="complete" && isSupplier && status=="confirmed") {
            if(!WorkflowState.Time(meta,"start_at",out var start)||start>DateTime.UtcNow)return BadRequest(new {error="An appointment cannot be completed before its start time"});
            meta["status"]="completed";item.NextDue=null;
        } else if(action=="reschedule" && isOwner && status is "requested" or "confirmed") {
            if(!WorkflowState.Time(input,"start_at",out var start)||!WorkflowState.Time(input,"end_at",out var end)||!Fits(orgs[supplierOrg],start,end))
                return BadRequest(new {error="Choose a valid future appointment slot"});
            if((await SupplierRows(supplierOrg)).Any(r=>Overlaps(r,start,end,id)))return Conflict(new {error="This slot is already booked"});
            meta["start_at"]=start;meta["end_at"]=end;meta["status"]="requested";item.NextDue=null;
        } else return BadRequest(new {error="This action is not allowed for the booking's current status"});
        meta["revision"]=revision+1;meta["note"]=WorkflowState.Text(input,"note");meta.Remove("notified_due");
        WorkflowState.List(meta,"events").Add(new JsonObject {["status"]=meta["status"]!.ToString(),["at"]=DateTime.UtcNow,["actor"]=User.FindFirst("userId")?.Value});
        item.Metadata=meta.ToJsonString();item.UpdatedAt=DateTime.UtcNow;
        foreach(var org in orgs.Values)WorkflowState.Notify(org,id+":"+meta["status"]+":"+(revision+1),"Booking "+meta["status"],item.Title,org.Id==supplierOrg?"/supplier":"/properties/"+item.PropertyId);
        await db.SaveChangesAsync();await tx.CommitAsync();return Ok(WorkflowState.Booking(item));
    }
    [HttpGet("api/bookings/{id:guid}/calendar")]
    public async Task<IActionResult> Calendar(Guid id) {
        var item=await db.MaintenanceItems.SingleOrDefaultAsync(m=>m.Id==id);
        if(item==null)return NotFound();var meta=WorkflowState.Meta(item);
        if(meta["record_type"]?.ToString()!="booking" || (item.OrgId!=OrgId && meta["supplier_org_id"]?.ToString()!=OrgId.ToString()))return NotFound();
        if(!WorkflowState.Time(meta,"start_at",out var start)||!WorkflowState.Time(meta,"end_at",out var end))return NotFound();
        string Escape(string? text)=>(text??"").Replace("\\","\\\\").Replace("\r","").Replace("\n","\\n").Replace(",","\\,").Replace(";","\\;");
        var status=meta["status"]?.ToString();var calendarStatus=status=="confirmed"?"CONFIRMED":status is "cancelled" or "declined"?"CANCELLED":"TENTATIVE";
        var ics="BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Resiro//Bookings//EN\r\nBEGIN:VEVENT\r\nUID:"+id+"@resiro\r\nDTSTAMP:"+DateTime.UtcNow.ToString("yyyyMMddTHHmmssZ")+"\r\nDTSTART:"+start.ToString("yyyyMMddTHHmmssZ")+"\r\nDTEND:"+end.ToString("yyyyMMddTHHmmssZ")+"\r\nSUMMARY:"+Escape(item.Title)+"\r\nLOCATION:"+Escape(meta["property_address"]?.ToString())+"\r\nSTATUS:"+calendarStatus+"\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
        return File(Encoding.UTF8.GetBytes(ics),"text/calendar","resiro-booking.ics");
    }
}
