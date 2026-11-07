using Greenlit.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Auth;

/// <summary>
/// Whether an account belongs to someone the manager removed (L2-011): it has team rows, and every one is removed.
/// A person who was removed and later invited back has a live row again, so they are not refused.
/// </summary>
public static class RemovedMembers
{
    public const string Code = "member_removed";
    public const string Detail = "You were removed from this team.";

    public static async Task<bool> IsRemovedAsync(IAppDbContext db, Guid userId, CancellationToken ct)
    {
        var rows = db.TeamMembers.IgnoreQueryFilters().AsNoTracking().Where(m => m.UserId == userId);
        return await rows.AnyAsync(ct) && !await rows.AnyAsync(m => m.RemovedUtc == null, ct);
    }
}
