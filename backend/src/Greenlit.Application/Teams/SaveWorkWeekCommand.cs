using Greenlit.Application.Allowances;
using MediatR;

namespace Greenlit.Application.Teams;

/// <summary>Saves the team's work week (L2-039). Manager only.</summary>
public sealed record SaveWorkWeekCommand(IReadOnlyList<string>? Days) : IRequest<TeamSettingsDto>;
