using Greenlit.Application.Abstractions;
using Greenlit.Application.Auth;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Invitations;

/// <summary>
/// Turns an invitation into an account (L2-004 AC5): creates the user with the invitation's email and
/// the role chosen when the person was invited, links the member's row to it, uses the invitation up and
/// signs the person in. The row keeps its days. The invitation is claimed with one conditional update
/// first, so of two simultaneous submits only one can join; if creating the account then fails, the claim
/// is given back.
/// </summary>
public sealed class AcceptInvitationCommandHandler : IRequestHandler<AcceptInvitationCommand, SessionDto>
{
    public const string AccountExists = "account_exists";

    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly ITokenService _tokens;
    private readonly TimeProvider _time;

    public AcceptInvitationCommandHandler(IAppDbContext db, IPasswordHasher hasher, ITokenService tokens, TimeProvider time)
    {
        _db = db;
        _hasher = hasher;
        _tokens = tokens;
        _time = time;
    }

    public async Task<SessionDto> Handle(AcceptInvitationCommand request, CancellationToken ct)
    {
        var open = await InvitationLookup.FindOpenAsync(_db, _time, request.Token, ct);
        var invitation = open.Invitation;
        var email = invitation.Email.Trim();
        var lower = email.ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Email.ToLower() == lower, ct))
        {
            throw new ConflictException(AccountExists, "An account with this email already exists.");
        }

        var now = _time.GetUtcNow();
        var claimed = await _db.Invitations
            .Where(i => i.Id == invitation.Id && i.AcceptedUtc == null && i.RetiredUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.AcceptedUtc, now), ct);
        if (claimed == 0) throw InvitationLookup.Expired(open.ManagerName);

        var name = request.Name!.Trim();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = name,
            Role = open.Member.Role,
            CreatedUtc = now,
        };
        user.PasswordHash = _hasher.Hash(user, request.Password!);
        _db.Users.Add(user);
        open.Member.UserId = user.Id;
        open.Member.Name = name;
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            _db.DiscardChanges();
            await _db.Invitations.Where(i => i.Id == invitation.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.AcceptedUtc, (DateTimeOffset?)null), CancellationToken.None);
            if (await _db.Users.AnyAsync(u => u.Email.ToLower() == lower, CancellationToken.None))
            {
                throw new ConflictException(AccountExists, "An account with this email already exists.");
            }
            throw;
        }
        return _tokens.Issue(user, open.Member);
    }
}
