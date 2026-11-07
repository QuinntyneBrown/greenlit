using Greenlit.Application.Allowances;
using MediatR;

namespace Greenlit.Application.Teams;

/// <summary>Saves the team's two email switches (L2-043). Manager only; both must be given.</summary>
public sealed record SaveNotificationsCommand(bool? NewRequests, bool? Decisions) : IRequest<TeamSettingsDto>;
