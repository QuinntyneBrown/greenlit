using System.Globalization;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Sheet;

/// <summary>
/// Builds the month for the caller's team (docs/detailed-designs/sheet/view-month):
/// the manager sees the team in its order; a member sees their own row first.
/// </summary>
public sealed class GetMonthQueryHandler : IRequestHandler<GetMonthQuery, MonthDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly TimeProvider _time;

    public GetMonthQueryHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time)
    {
        _db = db;
        _currentUser = currentUser;
        _time = time;
    }

    public async Task<MonthDto> Handle(GetMonthQuery request, CancellationToken ct)
    {
        var userId = _currentUser.UserId ?? throw new NotFoundException("Team", "the signed-in user");

        var team = await _db.Teams.AsNoTracking()
            .Include(t => t.Members)
            .Where(t => t.ManagerUserId == userId || t.Members.Any(m => m.UserId == userId))
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Team", "the signed-in user");

        var today = TodayIn(team.TimeZone);
        var month = request.Month is null
            ? new DateOnly(today.Year, today.Month, 1)
            : DateOnly.ParseExact(request.Month + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture);

        var isManager = team.ManagerUserId == userId;
        var ordered = team.Members.OrderBy(m => m.SortOrder).ThenBy(m => m.Name).ToList();
        if (!isManager)
        {
            // L2-012 AC2: a member's own row comes first.
            var own = ordered.FirstOrDefault(m => m.UserId == userId);
            if (own is not null)
            {
                ordered.Remove(own);
                ordered.Insert(0, own);
            }
        }

        var members = ordered
            .Select(m => new MemberRowDto(m.Id, m.Name, Initials(m.Name), m.UserId == userId, DaysLeft: null))
            .ToList();

        return new MonthDto(
            month.ToString("yyyy-MM", CultureInfo.InvariantCulture),
            today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            isManager,
            CoverageMinimum: null,
            members);
    }

    private DateOnly TodayIn(string timeZone)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(timeZone);
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(_time.GetUtcNow(), zone).DateTime);
    }

    /// <summary>First letters of the first and last names: "Elif Yılmaz" is "EY".</summary>
    internal static string Initials(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return string.Empty;
        var first = parts[0][..1];
        var last = parts.Length > 1 ? parts[^1][..1] : string.Empty;
        return (first + last).ToUpper(CultureInfo.InvariantCulture);
    }
}
