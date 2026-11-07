using Greenlit.Application.Abstractions;
using Greenlit.Application.Allowances;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Sheet;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Requests;

/// <summary>One request of the manager's team with the team around it (L2-023).</summary>
public sealed record GetRequestQuery(Guid Id) : IRequest<RequestDetailDto>;

/// <summary>
/// The request, and every member's days from the Monday of the request's first week to the Sunday of its
/// last, so the manager sees who else is out. <c>Members</c> and <c>Coverage</c> are the sheet's own shapes.
/// <c>DaysLeftAfter</c> is the requester's days left once their requests are approved (Left minus Requested; L2-023 AC1).
/// </summary>
public sealed record RequestDetailDto(
    RequestSummaryDto Request,
    IReadOnlyList<MemberRowDto> Members,
    IReadOnlyList<CoverageDto> Coverage,
    int DaysLeftAfter);

/// <summary>
/// Opens a request of the manager's own team (docs/detailed-designs/requests/review-requests). An id that is
/// unknown or on another team is the same 404, so nothing about other teams leaks.
/// </summary>
public sealed class GetRequestQueryHandler : IRequestHandler<GetRequestQuery, RequestDetailDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly AllowanceCalculator _allowances;

    public GetRequestQueryHandler(IAppDbContext db, ICurrentUser currentUser, AllowanceCalculator allowances)
    {
        _db = db;
        _currentUser = currentUser;
        _allowances = allowances;
    }

    public async Task<RequestDetailDto> Handle(GetRequestQuery query, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var request = await _db.TimeOffRequests.AsNoTracking()
            .Include(r => r.TeamMember)
            .Include(r => r.Days)
            .FirstOrDefaultAsync(r => r.Id == query.Id && r.TeamMember.TeamId == team.Id, ct)
            ?? throw new NotFoundException("That request was not found.") { Code = "request_not_found" };
        var summary = (await RequestSummaries.BuildAsync(_db, team, [request], ct)).Single();

        var first = request.FirstDay.AddDays(-DaysSinceMonday(request.FirstDay));
        var last = request.LastDay.AddDays(6 - DaysSinceMonday(request.LastDay));
        var dates = Enumerable.Range(0, last.DayNumber - first.DayNumber + 1).Select(first.AddDays).ToList();

        var members = await _db.TeamMembers.AsNoTracking()
            .Where(m => m.TeamId == team.Id)
            .OrderBy(m => m.SortOrder).ThenBy(m => m.Name)
            .ToListAsync(ct);
        var memberIds = members.Select(m => m.Id).ToList();
        var statusOf = (await _db.TimeOffDays.AsNoTracking()
                .Where(d => memberIds.Contains(d.TeamMemberId) && d.Date >= first && d.Date <= last)
                .ToListAsync(ct))
            .ToDictionary(d => (d.TeamMemberId, d.Date), d => d.Status);
        var holidays = await _db.Holidays.AsNoTracking()
            .Where(h => h.TeamId == team.Id && h.Date >= first && h.Date <= last)
            .ToDictionaryAsync(h => h.Date, h => h.Name, ct);

        var rows = members
            .Select(m => new MemberRowDto(
                m.Id, m.Name, GetMonthQueryHandler.Initials(m.Name), m.UserId == _currentUser.UserId, DaysLeft: null, Allowance: null,
                dates.Select(date => GetMonthQueryHandler.CellFor(m.Id, date, holidays, statusOf, WorkingDays.MonToFri)).ToList()))
            .ToList();

        var coverage = dates
            .Select((date, i) => (date, i))
            .Where(x => !WorkingDayRule.IsWeekend(x.date) && !holidays.ContainsKey(x.date))
            .Select(x =>
            {
                var kinds = rows.Select(r => r.Cells[x.i].Kind).ToList();
                var outCount = kinds.Count(k => k is CellKind.Requested or CellKind.Confirmed);
                var inCount = kinds.Count(k => k is CellKind.Working or CellKind.Tentative);
                return new CoverageDto(RequestInput.Iso(x.date), outCount, inCount, BelowMinimum: false);
            })
            .ToList();

        var asker = (await _allowances.ComputeAsync(team, [request.TeamMember], ct))[request.TeamMemberId];
        return new RequestDetailDto(summary, rows, coverage, asker.Left - asker.Requested);
    }

    /// <summary>0 for Monday through 6 for Sunday.</summary>
    private static int DaysSinceMonday(DateOnly date) => ((int)date.DayOfWeek + 6) % 7;
}
