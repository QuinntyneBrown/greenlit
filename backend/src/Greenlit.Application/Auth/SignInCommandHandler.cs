using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Teams;
using Greenlit.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Auth;

/// <summary>
/// Verifies the email and password and issues the session. Every mismatch, an
/// unknown email included, is the same <c>invalid_credentials</c> failure, and an
/// unknown email still costs one hash check, so the answer reveals nothing about
/// which accounts exist.
/// </summary>
public sealed class SignInCommandHandler : IRequestHandler<SignInCommand, SessionDto>
{
    public const string InvalidCredentials = "invalid_credentials";

    /// <summary>Stands in when no account matches, so both paths do the same hashing work.</summary>
    private static readonly User NoOne = new() { Id = Guid.Empty };
    private static string? _noOnesHash;

    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly ITokenService _tokens;

    public SignInCommandHandler(IAppDbContext db, IPasswordHasher hasher, ITokenService tokens)
    {
        _db = db;
        _hasher = hasher;
        _tokens = tokens;
    }

    public async Task<SessionDto> Handle(SignInCommand request, CancellationToken ct)
    {
        var email = request.Email!.Trim().ToLowerInvariant();
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email.ToLower() == email, ct);

        if (user is null)
        {
            _noOnesHash ??= _hasher.Hash(NoOne, Guid.NewGuid().ToString());
            _hasher.Verify(NoOne, _noOnesHash, request.Password!);
            throw Mismatch();
        }
        // A Google-only account has no password (ADR-012): it costs the dummy check, like an unknown email.
        if (user.PasswordHash.Length == 0)
        {
            _noOnesHash ??= _hasher.Hash(NoOne, Guid.NewGuid().ToString());
            _hasher.Verify(NoOne, _noOnesHash, request.Password!);
            throw Mismatch();
        }
        if (!_hasher.Verify(user, user.PasswordHash, request.Password!)) throw Mismatch();

        if (await RemovedMembers.IsRemovedAsync(_db, user.Id, ct))
            throw new UnauthorizedException(RemovedMembers.Code, RemovedMembers.Detail);

        var member = await TeamChoice.ForSignInAsync(_db, user.Id, ct);
        return await Sessions.IssueAsync(_db, _tokens, user, member, ct);
    }

    private static UnauthorizedException Mismatch() =>
        new(InvalidCredentials, "Email or password doesn't match.");
}
