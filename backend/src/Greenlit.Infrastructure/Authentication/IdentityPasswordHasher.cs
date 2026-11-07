using Greenlit.Application.Abstractions;
using Greenlit.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Greenlit.Infrastructure.Authentication;

/// <summary>ASP.NET Core Identity's PBKDF2 <see cref="PasswordHasher{TUser}"/> behind <see cref="IPasswordHasher"/>.</summary>
public sealed class IdentityPasswordHasher : IPasswordHasher
{
    private readonly PasswordHasher<User> _inner = new();

    public string Hash(User user, string password) => _inner.HashPassword(user, password);

    public bool Verify(User user, string hash, string password)
    {
        if (string.IsNullOrEmpty(hash)) return false;
        try
        {
            return _inner.VerifyHashedPassword(user, hash, password) != PasswordVerificationResult.Failed;
        }
        catch (FormatException)
        {
            // Not a hash at all (e.g. a seed placeholder): it can never match.
            return false;
        }
    }
}
