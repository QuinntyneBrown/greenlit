using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Auth;

/// <summary>Who the caller is, for the account menu (L2-006, docs/detailed-designs/identity-and-access/sign-out).</summary>
public sealed record GetAccountQuery : IRequest<AccountDto>;

/// <summary>The signed-in person as the account menu names them.</summary>
public sealed record AccountDto(string DisplayName, string Email, UserRole Role);

public sealed class GetAccountQueryHandler : IRequestHandler<GetAccountQuery, AccountDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _current;

    public GetAccountQueryHandler(IAppDbContext db, ICurrentUser current)
    {
        _db = db;
        _current = current;
    }

    public async Task<AccountDto> Handle(GetAccountQuery request, CancellationToken ct)
    {
        var id = _current.UserId ?? throw new UnauthorizedException("unauthorized", "Sign in to continue.");
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new UnauthorizedException("unauthorized", "Sign in to continue.");
        return new AccountDto(user.DisplayName, user.Email, user.Role);
    }
}
