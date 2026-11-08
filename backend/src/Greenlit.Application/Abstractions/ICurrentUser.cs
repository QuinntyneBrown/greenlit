namespace Greenlit.Application.Abstractions;

/// <summary>
/// The signed-in caller, read from the bearer token's <c>sub</c> claim. Handlers
/// resolve the caller's team from it, so every query stays scoped to that team.
/// </summary>
public interface ICurrentUser
{
    /// <summary>The caller's user id; null when the request carries no valid token.</summary>
    Guid? UserId { get; }

    /// <summary>The active team the session names (its <c>team_id</c> claim, ADR-014); null when the token names none.</summary>
    Guid? TeamId { get; }
}
