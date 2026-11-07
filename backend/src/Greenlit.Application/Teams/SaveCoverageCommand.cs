using Greenlit.Application.Allowances;
using MediatR;

namespace Greenlit.Application.Teams;

/// <summary>Saves the team's coverage minimum (L2-041). Manager only; 0 means no minimum.</summary>
public sealed record SaveCoverageCommand(int? Minimum) : IRequest<TeamSettingsDto>;
