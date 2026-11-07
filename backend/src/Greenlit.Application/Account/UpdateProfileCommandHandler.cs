using Greenlit.Application.Abstractions;
using Greenlit.Application.Auth;
using Greenlit.Application.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Account;

/// <summary>
/// Saves the caller's own name and email. The caller's team row follows, so the sheet and the account agree.
/// A taken address (compared ignoring case) is <c>email_taken</c> and nothing is saved.
/// </summary>
public sealed class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand, AccountDto>
{
    public const string EmailTaken = "email_taken";

    private readonly IAppDbContext _db;
    private readonly ICurrentUser _current;

    public UpdateProfileCommandHandler(IAppDbContext db, ICurrentUser current)
    {
        _db = db;
        _current = current;
    }

    public async Task<AccountDto> Handle(UpdateProfileCommand request, CancellationToken ct)
    {
        var id = _current.UserId ?? throw new UnauthorizedException("unauthorized", "Sign in to continue.");
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new UnauthorizedException("unauthorized", "Sign in to continue.");
        var name = request.DisplayName!.Trim();
        var email = request.Email!.Trim();
        var lowered = email.ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Id != id && u.Email.ToLower() == lowered, ct))
            throw new ConflictException(EmailTaken, "That email is already in use.");

        user.DisplayName = name;
        user.Email = email;
        var member = await _db.TeamMembers.FirstOrDefaultAsync(m => m.UserId == id, ct);
        if (member is not null)
        {
            member.Name = name;
            member.Email = email;
        }
        await _db.SaveChangesAsync(ct);
        return new AccountDto(user.DisplayName, user.Email, user.Role);
    }
}
