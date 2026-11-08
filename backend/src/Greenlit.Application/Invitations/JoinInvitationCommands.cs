using Greenlit.Application.Abstractions;
using Greenlit.Application.Auth;
using Greenlit.Application.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Invitations;

/// <summary>Join with the signed-in account, whose email must be the invitation's (L2-058 AC4, AC5).</summary>
public sealed record JoinInvitationCommand(string Token) : IRequest<SessionDto>;

/// <summary>Join while signed out with the password of the account the invitation's email belongs to (L2-058 AC2, AC3).</summary>
public sealed record SignInAndJoinCommand(string Token, string? Password) : IRequest<SessionDto>;

public sealed class JoinInvitationCommandHandler : IRequestHandler<JoinInvitationCommand, SessionDto>
{
    public const string OtherAccount = "invitation_other_account";

    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly ITokenService _tokens;
    private readonly TimeProvider _time;

    public JoinInvitationCommandHandler(IAppDbContext db, ICurrentUser currentUser, ITokenService tokens, TimeProvider time)
    {
        _db = db;
        _currentUser = currentUser;
        _tokens = tokens;
        _time = time;
    }

    public async Task<SessionDto> Handle(JoinInvitationCommand request, CancellationToken ct)
    {
        var userId = _currentUser.UserId ?? throw new UnauthorizedException("unauthorized", "Sign in to join.");
        var open = await InvitationLookup.FindOpenAsync(_db, _time, request.Token, ct);
        var user = await _db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new UnauthorizedException("unauthorized", "Sign in to join.");
        if (!string.Equals(user.Email.Trim(), open.Invitation.Email.Trim(), StringComparison.OrdinalIgnoreCase))
            throw new ForbiddenException(OtherAccount, "This invitation was sent to another address.");
        return await InvitationMembership.AttachAsync(_db, _tokens, _time, open, user, ct);
    }
}

public sealed class SignInAndJoinCommandHandler : IRequestHandler<SignInAndJoinCommand, SessionDto>
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly ITokenService _tokens;
    private readonly TimeProvider _time;

    public SignInAndJoinCommandHandler(IAppDbContext db, IPasswordHasher hasher, ITokenService tokens, TimeProvider time)
    {
        _db = db;
        _hasher = hasher;
        _tokens = tokens;
        _time = time;
    }

    public async Task<SessionDto> Handle(SignInAndJoinCommand request, CancellationToken ct)
    {
        var open = await InvitationLookup.FindOpenAsync(_db, _time, request.Token, ct);
        var lower = open.Invitation.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email.ToLower() == lower, ct);
        // The same answer as sign-in for a wrong password, a Google-only account or no account (L2-001 AC3).
        if (user is null || user.PasswordHash.Length == 0 || !_hasher.Verify(user, user.PasswordHash, request.Password ?? string.Empty))
            throw new UnauthorizedException(SignInCommandHandler.InvalidCredentials, "Email or password doesn't match.");
        return await InvitationMembership.AttachAsync(_db, _tokens, _time, open, user, ct);
    }
}
