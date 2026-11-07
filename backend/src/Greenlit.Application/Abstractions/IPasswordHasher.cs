using Greenlit.Domain.Entities;

namespace Greenlit.Application.Abstractions;

/// <summary>Hashes and verifies account passwords; implemented in Greenlit.Infrastructure.</summary>
public interface IPasswordHasher
{
    string Hash(User user, string password);

    /// <summary>True only when <paramref name="hash"/> is a hash of <paramref name="password"/>; a malformed hash never verifies.</summary>
    bool Verify(User user, string hash, string password);
}
