using FluentValidation;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Requests;

/// <summary>The manager declines a pending request, saying why when they want to (L2-025).</summary>
public sealed record DeclineRequestCommand(Guid RequestId, string? Reason) : IRequest<DeclineResult>;

/// <summary>What the decline did, for the toast: whose request, its range and whether the member was emailed.</summary>
public sealed record DeclineResult(
    Guid RequestId,
    string MemberName,
    string FirstDay,
    string LastDay,
    int Days,
    string? Reason,
    bool Emailed);

public sealed class DeclineRequestCommandValidator : AbstractValidator<DeclineRequestCommand>
{
    public const int MaxReasonLength = 500;

    public DeclineRequestCommandValidator()
    {
        RuleFor(c => c.Reason).MaximumLength(MaxReasonLength)
            .WithMessage($"Keep the reason to {MaxReasonLength} characters or fewer.");
    }
}

/// <summary>
/// Manager only, own team only, Pending requests only (docs/detailed-designs/requests/decline-request).
/// An id that is unknown or on another team is the same 404.
/// </summary>
public sealed class DeclineRequestCommandHandler : IRequestHandler<DeclineRequestCommand, DeclineResult>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly TimeProvider _time;
    private readonly RequestNotifier _notifier;

    public DeclineRequestCommandHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time, RequestNotifier notifier)
    {
        _notifier = notifier;
        _db = db;
        _currentUser = currentUser;
        _time = time;
    }

    public async Task<DeclineResult> Handle(DeclineRequestCommand command, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var request = await _db.TimeOffRequests
            .Include(r => r.TeamMember)
            .Include(r => r.Days)
            .FirstOrDefaultAsync(r => r.Id == command.RequestId && r.TeamMember.TeamId == team.Id, ct)
            ?? throw new NotFoundException("That request was not found.") { Code = "request_not_found" };
        if (request.Status != RequestStatus.Pending)
            throw new ConflictException("request_not_pending", "That request has already been decided.");

        request.Decline(team.ManagerUserId, command.Reason, _time.GetUtcNow());
        await _db.SaveChangesAsync(ct);

        // The decline stands whatever the mail server does: this only says whether the member was told.
        var managerName = await RequestCaller.ManagerNameAsync(_db, team, ct);
        var emailed = await _notifier.DeclinedAsync(managerName, request, ct);

        return new DeclineResult(
            request.Id, request.TeamMember.Name, RequestInput.Iso(request.FirstDay), RequestInput.Iso(request.LastDay),
            request.Days.Count, request.DeclineReason, emailed);
    }
}
