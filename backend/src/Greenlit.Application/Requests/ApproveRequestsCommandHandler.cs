using Greenlit.Application.Abstractions;
using Greenlit.Application.Coverage;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Requests;

/// <summary>
/// Approves pending requests of the manager's own team and confirms their days in one unit of work
/// (L2-024, docs/detailed-designs/requests/approve-request). An id that is unknown or on another
/// team is the same 404, one that is not Pending a 409, and either refuses the whole call.
/// </summary>
public sealed class ApproveRequestsCommandHandler : IRequestHandler<ApproveRequestsCommand, IReadOnlyList<ApprovalResult>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly TimeProvider _time;
    private readonly RequestNotifier _notifier;

    public ApproveRequestsCommandHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time, RequestNotifier notifier)
    {
        _notifier = notifier;
        _db = db;
        _currentUser = currentUser;
        _time = time;
    }

    public async Task<IReadOnlyList<ApprovalResult>> Handle(ApproveRequestsCommand command, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var ids = command.Ids!.Distinct().ToList();

        var requests = await _db.TimeOffRequests
            .Include(r => r.TeamMember)
            .Include(r => r.Days)
            .Where(r => ids.Contains(r.Id) && r.TeamMember.TeamId == team.Id)
            .ToListAsync(ct);
        if (requests.Count != ids.Count)
            throw new NotFoundException("That request was not found.") { Code = "request_not_found" };
        if (requests.Any(r => r.Status != RequestStatus.Pending))
            throw new ConflictException("request_not_pending", "That request has already been decided.");

        var now = _time.GetUtcNow();
        foreach (var request in requests) request.Approve(team.ManagerUserId, now);
        await _db.SaveChangesAsync(ct);

        // The approval stands whatever coverage says (L2-042 AC2): this only informs the manager.
        var allDates = requests.SelectMany(r => r.Days.Select(d => d.Date)).ToList();
        var inOn = allDates.Count == 0 || team.CoverageMinimum == 0
            ? new Dictionary<DateOnly, int>()
            : await CoverageCalculator.InOnAsync(_db, team, allDates, ct);

        var managerName = await RequestCaller.ManagerNameAsync(_db, team, ct);
        var results = new List<ApprovalResult>();
        foreach (var r in ids.Select(id => requests.Single(r => r.Id == id)))
        {
            var emailed = await _notifier.ApprovedAsync(team, managerName, r, ct);
            var shortDay = CoverageCalculator.FirstShort(team, r.Days.Select(d => d.Date), inOn);
            results.Add(new ApprovalResult(
                    r.Id, r.TeamMember.Name, RequestInput.Iso(r.FirstDay), RequestInput.Iso(r.LastDay), r.Days.Count,
                emailed,
                team.CoverageMinimum,
                shortDay is { } s ? RequestInput.Iso(s.Date) : null,
                shortDay?.In));
        }
        return results;
    }
}
