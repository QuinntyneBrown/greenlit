using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Support;

/// <summary>An account that is on no team yet, as the operator creates one for a new manager.</summary>
public static class TestAccount
{
    public static async Task<User> CreateAsync(GreenlitApiFactory factory, string name = "Noor Haddad")
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = $"{Guid.NewGuid():N}@example.com",
            DisplayName = name,
            PasswordHash = "not-used-by-these-tests",
            Role = UserRole.Member,
            CreatedUtc = DateTimeOffset.UtcNow,
        };
        await factory.WriteAsync(db => db.Users.Add(user));
        return user;
    }
}
