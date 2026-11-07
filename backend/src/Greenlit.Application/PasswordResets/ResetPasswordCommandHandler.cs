using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.PasswordResets;

/// <summary>
/// Sets the new password for the account the link was issued to and uses the link up (L2-003, ADR-011).
/// The token is claimed with one conditional update first, so of two simultaneous submits only one can
/// succeed; if the password cannot be saved, the claim is given back.
/// </summary>
public sealed class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand>
{
    public const string LinkExpired = "reset_link_expired";

    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly TimeProvider _time;

    public ResetPasswordCommandHandler(IAppDbContext db, IPasswordHasher hasher, TimeProvider time)
    {
        _db = db;
        _hasher = hasher;
        _time = time;
    }

    public async Task Handle(ResetPasswordCommand request, CancellationToken ct)
    {
        var now = _time.GetUtcNow();
        var token = await PasswordResetLookup.FindUsableAsync(_db, _time, request.Token, ct);

        var claimed = await _db.PasswordResetTokens
            .Where(t => t.Id == token.Id && t.UsedUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.UsedUtc, now), ct);
        if (claimed == 0) throw Expired();

        try
        {
            var user = await _db.Users.SingleAsync(u => u.Id == token.UserId, ct);
            user.PasswordHash = _hasher.Hash(user, request.Password!);
            await _db.SaveChangesAsync(ct);
        }
        catch
        {
            _db.DiscardChanges();
            await _db.PasswordResetTokens.Where(t => t.Id == token.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.UsedUtc, (DateTimeOffset?)null), CancellationToken.None);
            throw;
        }
    }

    public static GoneException Expired() => new(LinkExpired, "This link has expired.");
}
