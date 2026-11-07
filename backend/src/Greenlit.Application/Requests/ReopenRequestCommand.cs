using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Requests;

/// <summary>Undo of a decision: the request is Pending again and its days Requested (L2-024 AC3, L2-025).</summary>
public sealed record ReopenRequestCommand(Guid RequestId) : IRequest;

/// <summary>
/// Manager only, own team only, Approved or Declined requests only. No email follows: the member was told once
/// (docs/detailed-designs/requests/approve-request).
/// </summary>
public sealed class ReopenRequestCommandHandler : IRequestHandler<ReopenRequestCommand>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly TimeProvider _time;

    public ReopenRequestCommandHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time)
    {
        _db = db;
        _currentUser = currentUser;
        _time = time;
    }

    public async Task Handle(ReopenRequestCommand command, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var request = await _db.TimeOffRequests
            .Include(r => r.Days)
            .FirstOrDefaultAsync(r => r.Id == command.RequestId && r.TeamMember.TeamId == team.Id, ct)
            ?? throw new NotFoundException("That request was not found.") { Code = "request_not_found" };
        if (request.Status is not (RequestStatus.Approved or RequestStatus.Declined))
            throw new ConflictException("request_not_decided", "Only an approved or declined request can be put back.");

        request.Reopen(_time.GetUtcNow());
        await _db.SaveChangesAsync(ct);
    }
}
