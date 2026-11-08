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
    /// <summary>The team sign-in opens for a manager of several teams (L2-054, ADR-014); null until their first team. Never trusted alone: see TeamChoice.</summary>
    public Guid? DefaultTeamId { get; set; }
    public DateTimeOffset CreatedUtc { get; set; }
}
