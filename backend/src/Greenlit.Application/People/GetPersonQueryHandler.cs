using Greenlit.Application.Abstractions;
using Greenlit.Application.Allowances;
using Greenlit.Application.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.People;

/// <summary>Builds a person's page for the caller (docs/detailed-designs/allowances/person-page).</summary>
public sealed class GetPersonQueryHandler : IRequestHandler<GetPersonQuery, PersonDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly AllowanceCalculator _allowances;

    public GetPersonQueryHandler(IAppDbContext db, ICurrentUser currentUser, AllowanceCalculator allowances)
    {
        _db = db;
        _currentUser = currentUser;
        _allowances = allowances;
    }

    public async Task<PersonDto> Handle(GetPersonQuery request, CancellationToken ct)
    {
        var userId = _currentUser.UserId ?? throw new NotFoundException("Team", "the signed-in user");

        var team = await _db.Teams.AsNoTracking()
            .Include(t => t.Members)
            .Where(t => t.ManagerUserId == userId || t.Members.Any(m => m.UserId == userId))
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Team", "the signed-in user");

        var isManager = team.ManagerUserId == userId;
        var member = (request.Id is { } id
                ? team.Members.FirstOrDefault(m => m.Id == id)
                : team.Members.FirstOrDefault(m => m.UserId == userId))
            ?? throw new NotFoundException("This person isn't on the team.") { Code = "person_not_found" };

        // L2-035 AC1: a member sees only their own page; the manager sees everyone's.
        var isYou = member.UserId == userId;
        if (!isManager && !isYou)
            throw new ForbiddenException("own_details_only", "Only your own details are visible.");

        var figures = (await _allowances.ComputeAsync(team, [member], ct))[member.Id];
        var (first, _) = AllowanceCalculator.LeaveYear(team, _allowances.Today(team));

        return new PersonDto(member.Id, member.Name, first.Year, isYou, isManager, figures);
    }
}
