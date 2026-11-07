using Greenlit.Application.Abstractions;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Requests;

/// <summary>How many requests each tab of the ledger holds; Declined includes Cancelled (L2-022 AC1, AC4, AC8).</summary>
public sealed record CountRequestsQuery : IRequest<RequestCountsDto>;

public sealed record RequestCountsDto(int Pending, int Approved, int Declined);

public sealed class CountRequestsQueryHandler : IRequestHandler<CountRequestsQuery, RequestCountsDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public CountRequestsQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<RequestCountsDto> Handle(CountRequestsQuery query, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var byStatus = await _db.TimeOffRequests.AsNoTracking()
            .Where(r => r.TeamMember.TeamId == team.Id)
            .GroupBy(r => r.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        int Of(params RequestStatus[] statuses) => byStatus.Where(x => statuses.Contains(x.Status)).Sum(x => x.Count);
        return new RequestCountsDto(
            Of(RequestStatus.Pending),
            Of(RequestStatus.Approved),
            Of(RequestStatus.Declined, RequestStatus.Cancelled));
    }
}
