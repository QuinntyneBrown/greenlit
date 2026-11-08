using Greenlit.Application.Auth;
using MediatR;

namespace Greenlit.Application.Teams;

/// <summary>Create a team with its first rows (L2-008, docs/detailed-designs/teams/create-team).</summary>
public sealed record CreateTeamCommand(
    string? Name,
    string? TimeZone,
    string? HolidayCountry,
    IReadOnlyList<NewMemberRow>? Members) : IRequest<CreatedTeamDto>;

/// <summary>One row of "Who is on the team?": a name, and an email to invite them by (journey 5).</summary>
public sealed record NewMemberRow(string? Name, string? Email);

/// <summary>The new team and a session for its manager that names it. <c>Invited</c> counts the invitations sent.</summary>
public sealed record CreatedTeamDto(Guid TeamId, string Name, int Invited, SessionDto Session);

/// <summary>The choices the create-team page offers (L2-008 AC2).</summary>
public static class TeamOptions
{
    /// <summary>London, Dublin, "Paris, Berlin (CET)" and New York.</summary>
    public static readonly IReadOnlyList<string> TimeZones =
        ["Europe/London", "Europe/Dublin", "Europe/Paris", "America/New_York"];

    public const string NoHolidays = "none";

    /// <summary>United Kingdom, Ireland, United States, Canada, Italy, and none.</summary>
    public static readonly IReadOnlyList<string> HolidayCountries = ["GB", "IE", "US", "CA", "IT", NoHolidays];
}
