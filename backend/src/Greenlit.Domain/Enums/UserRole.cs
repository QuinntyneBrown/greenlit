namespace Greenlit.Domain.Enums;

public enum UserRole
{
    /// <summary>A team member: sees the team's sheet, edits their own days.</summary>
    Member,

    /// <summary>The team's manager: confirms requests, owns holidays and membership.</summary>
    Manager,

    /// <summary>Platform operator.</summary>
    Admin,
}
