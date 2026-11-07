using MediatR;

namespace Greenlit.Application.Allowances;

/// <summary>The team's allowance defaults for the Settings page (L2-027). Manager only.</summary>
public sealed record GetTeamSettingsQuery : IRequest<TeamSettingsDto>;

/// <summary><c>MembersWithoutAllowance</c> counts members who use the default because they have no yearly days of their own (AC4).</summary>
public sealed record TeamSettingsDto(int DefaultYearlyDays, int LeaveYearStartMonth, int MaxCarryOver, int MembersWithoutAllowance);

/// <summary>Saves the defaults (L2-027 AC1). Manager only.</summary>
public sealed record SaveAllowanceDefaultsCommand(int? DefaultYearlyDays, int? LeaveYearStartMonth, int? MaxCarryOver) : IRequest<TeamSettingsDto>;
