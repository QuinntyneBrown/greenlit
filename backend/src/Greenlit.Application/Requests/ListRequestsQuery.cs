using FluentValidation;
using Greenlit.Application.Abstractions;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Requests;

/// <summary>The team's requests that have this status (default Pending), oldest first.</summary>
public sealed record ListRequestsQuery(string? Status) : IRequest<IReadOnlyList<RequestDto>>;

public sealed class ListRequestsQueryValidator : AbstractValidator<ListRequestsQuery>
{
    public ListRequestsQueryValidator()
    {
        RuleFor(q => q.Status)
            .Must(s => Enum.TryParse<RequestStatus>(s, ignoreCase: true, out _))
            .When(q => !string.IsNullOrEmpty(q.Status))
            .WithMessage("Status must be Pending, Approved, Declined or Cancelled.");
    }
}

/// <summary>The manager's list (docs/detailed-designs/requests/approve-request): only the caller's own team is read.</summary>
public sealed class ListRequestsQueryHandler : IRequestHandler<ListRequestsQuery, IReadOnlyList<RequestDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public ListRequestsQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<RequestDto>> Handle(ListRequestsQuery query, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var status = string.IsNullOrEmpty(query.Status)
            ? RequestStatus.Pending
            : Enum.Parse<RequestStatus>(query.Status, ignoreCase: true);

        var requests = await _db.TimeOffRequests.AsNoTracking()
            .Include(r => r.TeamMember)
            .Include(r => r.Days)
            .Where(r => r.TeamMember.TeamId == team.Id && r.Status == status)
            .ToListAsync(ct);
        // Ordered here: SQLite cannot sort DateTimeOffset in SQL.
        return requests
            .OrderBy(r => r.CreatedUtc).ThenBy(r => r.FirstDay)
            .Select(r => new RequestDto(
                r.Id, r.TeamMemberId, r.TeamMember.Name,
                RequestInput.Iso(r.FirstDay), RequestInput.Iso(r.LastDay),
                r.Days.Count, r.Note, r.Status.ToString(), r.CreatedUtc))
            .ToList();
    }
}
