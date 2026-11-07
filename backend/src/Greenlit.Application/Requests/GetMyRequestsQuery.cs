using Greenlit.Application.Abstractions;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Requests;

/// <summary>The caller's own requests, split into Upcoming (pending) and Past (decided or cancelled) (L2-020).</summary>
public sealed record GetMyRequestsQuery : IRequest<MyRequestsDto>;

/// <summary>
/// <c>Upcoming</c> is oldest first; <c>Past</c> is the most recently sent first. <c>ManagerName</c> is who decides,
/// for the New request and Cancel request dialogs.
/// </summary>
public sealed record MyRequestsDto(string ManagerName, IReadOnlyList<RequestSummaryDto> Upcoming, IReadOnlyList<RequestSummaryDto> Past);

/// <summary>
/// Reads only the caller's own row of their own team (docs/detailed-designs/requests/my-requests): a teammate's
/// requests, or another team's, are never loaded. A caller on no team is a 404.
/// </summary>
public sealed class GetMyRequestsQueryHandler : IRequestHandler<GetMyRequestsQuery, MyRequestsDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public GetMyRequestsQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<MyRequestsDto> Handle(GetMyRequestsQuery query, CancellationToken ct)
    {
        var (team, member) = await RequestCaller.FindAsync(_db, _currentUser, ct);
        var requests = await _db.TimeOffRequests.AsNoTracking()
            .Include(r => r.TeamMember)
            .Include(r => r.Days)
            .Where(r => r.TeamMemberId == member.Id)
            .ToListAsync(ct);

        // Ordered here: SQLite cannot sort DateTimeOffset in SQL.
        var upcoming = requests.Where(r => r.Status == RequestStatus.Pending)
            .OrderBy(r => r.FirstDay).ThenBy(r => r.CreatedUtc).ToList();
        var past = requests.Where(r => r.Status != RequestStatus.Pending)
            .OrderByDescending(r => r.CreatedUtc).ThenByDescending(r => r.FirstDay).ToList();

        return new MyRequestsDto(
            await RequestCaller.ManagerNameAsync(_db, team, ct),
            await RequestSummaries.BuildAsync(_db, team, upcoming, ct),
            await RequestSummaries.BuildAsync(_db, team, past, ct));
    }
}
