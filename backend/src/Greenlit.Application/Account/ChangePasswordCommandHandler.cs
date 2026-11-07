using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Account;

/// <summary>Verifies the current password, then stores the new hash. A wrong current password is <c>current_password_wrong</c>.</summary>
public sealed class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand>
{
    public const string CurrentPasswordWrong = "current_password_wrong";

    private readonly IAppDbContext _db;
    private readonly ICurrentUser _current;
    private readonly IPasswordHasher _hasher;

    public ChangePasswordCommandHandler(IAppDbContext db, ICurrentUser current, IPasswordHasher hasher)
    {
        _db = db;
        _current = current;
        _hasher = hasher;
    }

    public async Task Handle(ChangePasswordCommand request, CancellationToken ct)
    {
        var id = _current.UserId ?? throw new UnauthorizedException("unauthorized", "Sign in to continue.");
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new UnauthorizedException("unauthorized", "Sign in to continue.");
        if (string.IsNullOrEmpty(request.CurrentPassword) || !_hasher.Verify(user, user.PasswordHash, request.CurrentPassword))
            throw new BadRequestException(CurrentPasswordWrong, "That isn’t your current password.");

        user.PasswordHash = _hasher.Hash(user, request.NewPassword!);
        await _db.SaveChangesAsync(ct);
    }
}
