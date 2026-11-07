using Greenlit.Domain.Enums;

namespace Greenlit.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    /// <summary>Google's stable id for the account that signs this person in, once linked (ADR-012); null otherwise.</summary>
    public string? GoogleSubject { get; set; }
    public UserRole Role { get; set; } = UserRole.Member;
    public DateTimeOffset CreatedUtc { get; set; }
}
