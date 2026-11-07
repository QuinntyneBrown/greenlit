using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Requests;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>
/// Stamps <c>RemovedUtc</c> on a member of the caller's own team (L2-011). The row, their days and their adjustments
/// stay as history; a query filter takes the row off the sheet, the year and the requests. The manager cannot remove
/// themselves (the team would have none), and a member of another team or an already-removed one is a 404, so nothing
/// about other teams leaks.
/// </summary>
public sealed class RemoveMemberCommandHandler : IRequestHandler<RemoveMemberCommand>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly TimeProvider _time;

    public RemoveMemberCommandHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time)
    {
        _db = db;
        _currentUser = currentUser;
        _time = time;
    }

    public async Task Handle(RemoveMemberCommand request, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var member = await _db.TeamMembers.SingleOrDefaultAsync(m => m.Id == request.MemberId && m.TeamId == team.Id, ct)
            ?? throw new NotFoundException("This person isn't on the team.") { Code = "person_not_found" };
        if (member.UserId == team.ManagerUserId)
            throw new ConflictException("cannot_remove_self", "You can't remove yourself from your own team.");
        member.RemovedUtc = _time.GetUtcNow();
        await _db.SaveChangesAsync(ct);
    }
}
