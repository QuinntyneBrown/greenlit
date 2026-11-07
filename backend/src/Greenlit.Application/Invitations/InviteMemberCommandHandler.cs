using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Invitations;

/// <summary>
/// Invites a person to the caller's team (L2-010, ADR-006). Only the team's manager may; the team is
/// always the caller's own. The row and invitation are saved first and the email goes out second;
/// if the email cannot be sent they are taken away again, so nothing was added (AC4). An email
/// that is already on the team and has not joined yet is a re-invite: the earlier link is retired
/// and a new one sent. One that has joined is refused with <see cref="MemberExists"/>.
/// </summary>
public sealed class InviteMemberCommandHandler : IRequestHandler<InviteMemberCommand, InvitedMemberDto>
{
    public const string MemberExists = "member_exists";

    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IEmailSender _email;
    private readonly InvitationIssuer _issuer;

    public InviteMemberCommandHandler(IAppDbContext db, ICurrentUser currentUser, IEmailSender email, InvitationIssuer issuer)
    {
        _db = db;
        _currentUser = currentUser;
        _email = email;
        _issuer = issuer;
    }

    public async Task<InvitedMemberDto> Handle(InviteMemberCommand request, CancellationToken ct)
    {
        var userId = _currentUser.UserId ?? throw new UnauthorizedException("unauthorized", "Sign in to invite people.");
        var team = await _db.Teams.Include(t => t.Members).SingleOrDefaultAsync(t => t.ManagerUserId == userId, ct)
            ?? throw new ForbiddenException("forbidden", "Only the team's manager can invite people.");

        var name = request.Name!.Trim();
        var email = request.Email!.Trim();
        var role = Enum.Parse<UserRole>(request.Role!, ignoreCase: true);
        var managerName = team.Members.FirstOrDefault(m => m.UserId == team.ManagerUserId)?.Name ?? "Your manager";

        var existing = team.Members.FirstOrDefault(m => string.Equals(m.Email, email, StringComparison.OrdinalIgnoreCase));
        if (existing?.UserId is not null)
            throw new ConflictException(MemberExists, $"{existing.Name} is already on the team.");

        return existing is null
            ? await AddAsync(team, managerName, name, email, role, ct)
            : await ResendAsync(team, managerName, existing, existing.Email!, ct);
    }

    private async Task<InvitedMemberDto> AddAsync(Team team, string managerName, string name, string email, UserRole role, CancellationToken ct)
    {
        var member = new TeamMember
        {
            Id = Guid.NewGuid(),
            TeamId = team.Id,
            Name = name,
            Email = email,
            Role = role,
            SortOrder = team.Members.Count == 0 ? 0 : team.Members.Max(m => m.SortOrder) + 1,
        };
        var issued = _issuer.Issue(team, managerName, member, email);
        _db.TeamMembers.Add(member);
        _db.Invitations.Add(issued.Invitation);
        await _db.SaveChangesAsync(ct);

        try
        {
            await _email.SendAsync(issued.Email, ct);
        }
        catch
        {
            _db.TeamMembers.Remove(member);
            await _db.SaveChangesAsync(CancellationToken.None);
            throw;
        }
        return new InvitedMemberDto(member.Id, member.Name, email, member.Role.ToString(), Resent: false);
    }

    private async Task<InvitedMemberDto> ResendAsync(Team team, string managerName, TeamMember member, string email, CancellationToken ct)
    {
        var earlier = await _db.Invitations
            .Where(i => i.TeamMemberId == member.Id && i.AcceptedUtc == null && i.RetiredUtc == null)
            .ToListAsync(ct);
        var issued = _issuer.Issue(team, managerName, member, email);
        foreach (var old in earlier) old.RetiredUtc = issued.Invitation.SentUtc;
        _db.Invitations.Add(issued.Invitation);
        await _db.SaveChangesAsync(ct);

        try
        {
            await _email.SendAsync(issued.Email, ct);
        }
        catch
        {
            _db.Invitations.Remove(issued.Invitation);
            foreach (var old in earlier) old.RetiredUtc = null;
            await _db.SaveChangesAsync(CancellationToken.None);
            throw;
        }
        return new InvitedMemberDto(member.Id, member.Name, email, member.Role.ToString(), Resent: true);
    }
}
