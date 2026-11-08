using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Teams;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Auth;

/// <summary>
/// Signs a person in with the Google account behind an access token (L2-051, ADR-012): by the linked
/// subject first, else by the verified email (linking the subject for next time), else by creating a
/// manager account with no password and no team, which the app sends to create-team. An email Google
/// has not verified matches and creates nothing.
/// </summary>
public sealed class SignInWithGoogleCommandHandler : IRequestHandler<SignInWithGoogleCommand, GoogleSessionDto>
{
    private readonly IAppDbContext _db;
    private readonly IGoogleAccounts _accounts;
    private readonly ITokenService _tokens;
    private readonly TimeProvider _time;

    public SignInWithGoogleCommandHandler(IAppDbContext db, IGoogleAccounts accounts, ITokenService tokens, TimeProvider time)
    {
        _db = db;
        _accounts = accounts;
        _tokens = tokens;
        _time = time;
    }

    public async Task<GoogleSessionDto> Handle(SignInWithGoogleCommand request, CancellationToken ct)
    {
        var account = await GoogleSignIns.ReadAsync(_accounts, request.AccessToken!, ct);
        if (!account.EmailVerified)
            throw new UnauthorizedException(GoogleSignIns.EmailUnverified, "Google hasn't verified that email address.");

        var newAccount = false;
        var user = await _db.Users.FirstOrDefaultAsync(u => u.GoogleSubject == account.Subject, ct);
        if (user is null)
        {
            var email = GoogleSignIns.EmailOf(account);
            var lower = email.ToLowerInvariant();
            user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == lower, ct);
            if (user is not null)
            {
                user.GoogleSubject = account.Subject;
            }
            else
            {
                newAccount = true;
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = email,
                    DisplayName = GoogleSignIns.NameOf(account),
                    PasswordHash = string.Empty,
                    GoogleSubject = account.Subject,
                    Role = UserRole.Manager,
                    CreatedUtc = _time.GetUtcNow(),
                };
                _db.Users.Add(user);
            }
            await _db.SaveChangesAsync(ct);
        }

        if (await RemovedMembers.IsRemovedAsync(_db, user.Id, ct))
            throw new UnauthorizedException(RemovedMembers.Code, RemovedMembers.Detail);

        var member = await TeamChoice.ForSignInAsync(_db, user.Id, ct);
        return GoogleSessionDto.From(_tokens.Issue(user, member), newAccount);
    }
}
