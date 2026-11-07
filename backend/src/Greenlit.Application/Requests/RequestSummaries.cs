using Greenlit.Application.Sheet;
using Greenlit.Application.Abstractions;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Requests;

/// <summary>Another member who is out on some of a pending request's days (L2-022 AC2).</summary>
public sealed record OverlapDto(string MemberName, string FirstDay, string LastDay);

/// <summary>
/// A request as the manager's ledger and detail show it (docs/detailed-designs/requests/review-requests):
/// <see cref="RequestDto"/> plus when it was decided, why it was declined and, while pending, who else is out.
/// </summary>
public sealed record RequestSummaryDto(
    Guid Id,
    Guid MemberId,
    string MemberName,
    string FirstDay,
    string LastDay,
    int Days,
    string? Note,
    string Status,
    DateTimeOffset SentUtc,
    DateTimeOffset? DecidedUtc,
    string? DeclineReason,
    IReadOnlyList<OverlapDto> Overlaps);

/// <summary>Builds <see cref="RequestSummaryDto"/>s for requests of one team, loaded with their member and days.</summary>
internal static class RequestSummaries
{
    public static async Task<List<RequestSummaryDto>> BuildAsync(
        IAppDbContext db, Team team, IReadOnlyList<TimeOffRequest> requests, CancellationToken ct)
    {
        var pending = requests.Where(r => r.Status == RequestStatus.Pending).ToList();
        var overlaps = await OverlapsAsync(db, team, pending, ct);

        var summaries = new List<RequestSummaryDto>();
        foreach (var r in requests)
        {
            // A declined or cancelled request may have no days left to count: its range's working days stand in.
            var days = r.Days.Count > 0
                ? r.Days.Count
                : (await RequestCaller.WorkingDaysAsync(db, team.Id, WorkingDayRule.For(team, r.TeamMember), r.FirstDay, r.LastDay, ct)).Working.Count;
            summaries.Add(new RequestSummaryDto(
                r.Id, r.TeamMemberId, r.TeamMember.Name,
                RequestInput.Iso(r.FirstDay), RequestInput.Iso(r.LastDay),
                days, r.Note, r.Status.ToString(), r.CreatedUtc, r.DecidedUtc, r.DeclineReason,
                overlaps.GetValueOrDefault(r.Id) ?? []));
        }
        return summaries;
    }

    /// <summary>
    /// For each pending request, the other members of the team with a Requested or Confirmed day on one of its
    /// days, in the team's order, each with their first and last day among them.
    /// </summary>
    private static async Task<Dictionary<Guid, IReadOnlyList<OverlapDto>>> OverlapsAsync(
        IAppDbContext db, Team team, IReadOnlyList<TimeOffRequest> pending, CancellationToken ct)
    {
        var result = new Dictionary<Guid, IReadOnlyList<OverlapDto>>();
        if (pending.Count == 0) return result;

        var low = pending.Min(r => r.FirstDay);
        var high = pending.Max(r => r.LastDay);
        var out_ = await db.TimeOffDays.AsNoTracking()
            .Include(d => d.TeamMember)
            .Where(d => d.TeamMember.TeamId == team.Id
                && d.Date >= low && d.Date <= high
                && (d.Status == DayStatus.Requested || d.Status == DayStatus.Confirmed))
            .ToListAsync(ct);

        foreach (var request in pending)
        {
            var dates = request.Days.Select(d => d.Date).ToHashSet();
            result[request.Id] = out_
                .Where(d => d.TeamMemberId != request.TeamMemberId && dates.Contains(d.Date))
                .GroupBy(d => d.TeamMemberId)
                .OrderBy(g => g.First().TeamMember.SortOrder).ThenBy(g => g.First().TeamMember.Name)
                .Select(g => new OverlapDto(g.First().TeamMember.Name, RequestInput.Iso(g.Min(d => d.Date)), RequestInput.Iso(g.Max(d => d.Date))))
                .ToList();
        }
        return result;
    }
}
