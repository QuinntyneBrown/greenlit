using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.PasswordResets;

/// <summary>
/// Issues a reset token for the account behind the address and emails the link (L2-002, ADR-011).
/// An address with no account completes the same way, so the answer never says which exist.
/// </summary>
public sealed class RequestPasswordResetCommandHandler : IRequestHandler<RequestPasswordResetCommand>
{
    public const string EmailFailed = "email_failed";

    private readonly IAppDbContext _db;
    private readonly IEmailSender _email;
    private readonly IPasswordResetLinks _links;
    private readonly IAppLinks _app;
    private readonly TimeProvider _time;

    public RequestPasswordResetCommandHandler(IAppDbContext db, IEmailSender email, IPasswordResetLinks links, IAppLinks app, TimeProvider time)
    {
        _db = db;
        _email = email;
        _links = links;
        _app = app;
        _time = time;
    }

    public async Task Handle(RequestPasswordResetCommand request, CancellationToken ct)
    {
        var address = request.Email!.Trim().ToLowerInvariant();
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email.ToLower() == address, ct);
        if (user is null) return;

        var token = PasswordResetTokens.NewToken();
        var now = _time.GetUtcNow();
        await _db.PasswordResetTokens.Where(t => t.UserId == user.Id && t.UsedUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.UsedUtc, now), ct);
        var issued = new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = PasswordResetTokens.Hash(token),
            ExpiresUtc = now + PasswordResetToken.Lifetime,
        };
        _db.PasswordResetTokens.Add(issued);
        await _db.SaveChangesAsync(ct);

        try
        {
            await _email.SendAsync(PasswordResetEmail.Compose(user.DisplayName, user.Email, _links.For(token), _app.Origin), ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _db.PasswordResetTokens.Remove(issued);
            await _db.SaveChangesAsync(CancellationToken.None);
            throw new ServiceUnavailableException(EmailFailed, "The email could not be sent.", ex);
        }
    }
}
