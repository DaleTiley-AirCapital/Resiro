using Microsoft.EntityFrameworkCore;
using RezDNA.Data;

namespace RezDNA.API.Services;

public sealed class ReminderWorker : BackgroundService {
    private readonly IServiceScopeFactory scopes; private readonly ILogger<ReminderWorker> logger;
    public ReminderWorker(IServiceScopeFactory scopes,ILogger<ReminderWorker> logger){this.scopes=scopes;this.logger=logger;}
    protected override async Task ExecuteAsync(CancellationToken stop) {
        while(!stop.IsCancellationRequested) {
            try {await Sweep(stop);} catch(OperationCanceledException) when(stop.IsCancellationRequested){break;}
            catch(Exception ex){logger.LogError(ex,"Reminder sweep failed; the next sweep will retry");}
            try{await Task.Delay(TimeSpan.FromSeconds(20),stop);}catch(OperationCanceledException){break;}
        }
    }
    private async Task Sweep(CancellationToken stop) {
        using var scope=scopes.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RezDNADbContext>();
        var ids=await db.MaintenanceItems.FromSqlRaw("SELECT * FROM maintenance_items WHERE next_due <= NOW() AND metadata->>'record_type' IN ('reminder','booking') AND metadata->>'status' IN ('open','confirmed') AND COALESCE(metadata->>'notified_due','') = ''")
            .Select(m=>m.Id).Take(1000).ToListAsync(stop);
        foreach(var id in ids) {
            await using var tx=await db.Database.BeginTransactionAsync(stop);
            var item=await db.MaintenanceItems.AsNoTracking().SingleOrDefaultAsync(m=>m.Id==id,stop);
            if(item==null){await tx.RollbackAsync(stop);continue;}
            var org=(await WorkflowState.Lock(db,item.OrgId))[item.OrgId];
            item=await db.MaintenanceItems.SingleAsync(m=>m.Id==id,stop);
            var meta=WorkflowState.Meta(item); var kind=meta["record_type"]?.ToString();
            var status=meta["status"]?.ToString();
            var eligible=(kind=="reminder" && status=="open") || (kind=="booking" && status=="confirmed");
            var due=item.NextDue?.ToUniversalTime().ToString("O");
            if(eligible && item.NextDue<=DateTime.UtcNow && meta["notified_due"]?.ToString()!=due) {
                WorkflowState.Notify(org,id+":"+due,kind=="booking"?"Upcoming booking":"Reminder due",item.Title,"/properties/"+item.PropertyId);
                meta["notified_due"]=due;item.Metadata=meta.ToJsonString();await db.SaveChangesAsync(stop);
            }
            await tx.CommitAsync(stop);db.ChangeTracker.Clear();
        }
    }
}
