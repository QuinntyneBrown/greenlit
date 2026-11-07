using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Requests;

/// <summary>A member withdraws their own pending request (L2-021).</summary>
public sealed record CancelRequestCommand(Guid RequestId) : IRequest;

/// <summary>
/// Own request only, Pending only (docs/detailed-designs/requests/my-requests). A request that is someone
/// else's, on another team or unknown is the same 404, so nothing about other people's requests leaks; the
/// manager has no row of requests to cancel and gets it too. No email follows: nothing was decided.
/// </summary>
public sealed class CancelRequestCommandHandler : IRequestHandler<CancelRequestCommand>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly TimeProvider _time;

    public CancelRequestCommandHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time)
    {
        _db = db;
        _currentUser = currentUser;
        _time = time;
    }

    public async Task Handle(CancelRequestCommand command, CancellationToken ct)
    {
        var (_, member) = await RequestCaller.FindAsync(_db, _currentUser, ct);
        var request = await _db.TimeOffRequests
            .Include(r => r.Days)
            .FirstOrDefaultAsync(r => r.Id == command.RequestId && r.TeamMemberId == member.Id, ct)
            ?? throw new NotFoundException("That request was not found.") { Code = "request_not_found" };
        if (request.Status != RequestStatus.Pending)
            throw new ConflictException("request_not_pending", "That request has already been decided or cancelled.");

        request.Cancel(_time.GetUtcNow());
        await _db.SaveChangesAsync(ct);
    }
}
