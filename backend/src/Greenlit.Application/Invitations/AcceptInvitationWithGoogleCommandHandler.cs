using Greenlit.Application.Abstractions;
using Greenlit.Application.Auth;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Invitations;

/// <summary>
/// Turns an invitation into an account with a Google account (L2-052 AC3): the Google account's verified
/// email must be the address the invitation was sent to; then, as the password path does, the invitation
/// is claimed with one conditional update, the user is created (Google's name, the invitation's role, no
/// password, the Google subject linked), the row is linked and keeps its days, and the person is signed in.
/// </summary>
public sealed class AcceptInvitationWithGoogleCommandHandler : IRequestHandler<AcceptInvitationWithGoogleCommand, SessionDto>
{
    public const string EmailMismatch = "google_email_mismatch";

    private readonly IAppDbContext _db;
    private readonly IGoogleAccounts _accounts;
    private readonly ITokenService _tokens;
    private readonly TimeProvider _time;

    public AcceptInvitationWithGoogleCommandHandler(IAppDbContext db, IGoogleAccounts accounts, ITokenService tokens, TimeProvider time)
    {
        _db = db;
        _accounts = accounts;
        _tokens = tokens;
        _time = time;
    }

    public async Task<SessionDto> Handle(AcceptInvitationWithGoogleCommand request, CancellationToken ct)
    {
        var open = await InvitationLookup.FindOpenAsync(_db, _time, request.Token, ct);
        var invitation = open.Invitation;
        var email = invitation.Email.Trim();
        var lower = email.ToLowerInvariant();

        var account = await GoogleSignIns.ReadAsync(_accounts, request.AccessToken!, ct);
        if (!account.EmailVerified)
            throw new ConflictException(GoogleSignIns.EmailUnverified, "Google hasn't verified that email address.");
        if (GoogleSignIns.EmailOf(account).ToLowerInvariant() != lower)
            throw new ConflictException(EmailMismatch, "That Google account doesn't match this invitation.");

        // An address that already has an account joins with it (L2-052 AC6, L2-058 AC3, ADR-015), and the Google account
        // is linked to it as Continue with Google would; a Google account linked to a different address is refused.
        var existing = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == lower, ct);
        if (existing is not null)
        {
            if (existing.GoogleSubject is not null && existing.GoogleSubject != account.Subject)
                throw new ConflictException(AcceptInvitationCommandHandler.AccountExists, "An account with this email already exists.");
            existing.GoogleSubject ??= account.Subject;
            return await InvitationMembership.AttachAsync(_db, _tokens, _time, open, existing, ct);
        }
        if (await _db.Users.AnyAsync(u => u.GoogleSubject == account.Subject, ct))
            throw new ConflictException(AcceptInvitationCommandHandler.AccountExists, "An account with this email already exists.");

        var now = _time.GetUtcNow();
        var claimed = await _db.Invitations
            .Where(i => i.Id == invitation.Id && i.AcceptedUtc == null && i.RetiredUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.AcceptedUtc, now), ct);
        if (claimed == 0) throw InvitationLookup.Expired(open.ManagerName);

        var name = GoogleSignIns.NameOf(account);
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = name,
            PasswordHash = string.Empty,
            GoogleSubject = account.Subject,
            Role = open.Member.Role,
            CreatedUtc = now,
            // The team a person joins first is the one sign-in opens while they manage none (L2-056 AC4, ADR-015).
            DefaultTeamId = open.Team.Id,
        };
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
            if (await _db.Users.AnyAsync(u => u.Email.ToLower() == lower || u.GoogleSubject == account.Subject, CancellationToken.None))
            {
                throw new ConflictException(AcceptInvitationCommandHandler.AccountExists, "An account with this email already exists.");
            }
            throw;
        }
        return await Sessions.IssueAsync(_db, _tokens, user, open.Member, ct);
    }
}
