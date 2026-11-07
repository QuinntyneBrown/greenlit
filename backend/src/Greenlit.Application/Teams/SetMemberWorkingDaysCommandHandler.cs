using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Requests;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>
/// Saves one member's working days (L2-040). The override is stored only when it differs from the team's, so a member
/// sent the team's own days follows the team again (ADR-009). A member of another team is a 404, so nothing leaks.
/// </summary>
public sealed class SetMemberWorkingDaysCommandHandler : IRequestHandler<SetMemberWorkingDaysCommand, MemberWorkingDaysDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public SetMemberWorkingDaysCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<MemberWorkingDaysDto> Handle(SetMemberWorkingDaysCommand request, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var member = await _db.TeamMembers.SingleOrDefaultAsync(m => m.Id == request.MemberId && m.TeamId == team.Id, ct)
            ?? throw new NotFoundException("Member", request.MemberId);
        var days = WorkingDaysNames.Parse(request.Days!)!.Value;
        member.WorkingDays = days == team.WorkingDays ? null : days;
        await _db.SaveChangesAsync(ct);
        return new MemberWorkingDaysDto(member.Id, WorkingDaysNames.ToNames(days));
    }
}
