using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.PasswordResets;

/// <summary>Does the reset link still work? Opening the link asks this and changes nothing (L2-003 AC4).</summary>
public sealed record CheckPasswordResetLinkQuery(string Token) : IRequest;

public sealed class CheckPasswordResetLinkQueryHandler : IRequestHandler<CheckPasswordResetLinkQuery>
{
    private readonly IAppDbContext _db;
    private readonly TimeProvider _time;

    public CheckPasswordResetLinkQueryHandler(IAppDbContext db, TimeProvider time)
    {
        _db = db;
        _time = time;
    }

    public async Task Handle(CheckPasswordResetLinkQuery request, CancellationToken ct) =>
        await PasswordResetLookup.FindUsableAsync(_db, _time, request.Token, ct);
}

/// <summary>Finds the token behind a link and decides whether it still works; unknown, used and expired are all the same failure.</summary>
internal static class PasswordResetLookup
{
    public static async Task<Domain.Entities.PasswordResetToken> FindUsableAsync(IAppDbContext db, TimeProvider time, string? token, CancellationToken ct)
    {
        var hash = PasswordResetTokens.Hash(token ?? string.Empty);
        var found = await db.PasswordResetTokens.AsNoTracking().SingleOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (found is null || found.UsedUtc is not null || found.ExpiresUtc <= time.GetUtcNow())
            throw ResetPasswordCommandHandler.Expired();
        return found;
    }
}
