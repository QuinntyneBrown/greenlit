using Greenlit.Application.Allowances;
using Greenlit.Application.Teams;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>The team's allowance defaults (docs/detailed-designs/allowances/allowance-figures). Managers only.</summary>
[ApiController]
[Route("api/team/settings")]
[Authorize(Policy = "Manager")]
public sealed class TeamSettingsController : ControllerBase
{
    private readonly ISender _sender;

    public TeamSettingsController(ISender sender) => _sender = sender;

    [HttpGet]
    public Task<TeamSettingsDto> Get(CancellationToken ct) => _sender.Send(new GetTeamSettingsQuery(), ct);

    [HttpPut("allowances")]
    public Task<TeamSettingsDto> SaveAllowances([FromBody] SaveAllowanceDefaultsCommand command, CancellationToken ct) =>
        _sender.Send(command, ct);

    /// <summary>The team's work week (docs/detailed-designs/teams/working-days).</summary>
    [HttpPut("work-week")]
    public Task<TeamSettingsDto> SaveWorkWeek([FromBody] SaveWorkWeekCommand command, CancellationToken ct) =>
        _sender.Send(command, ct);

    /// <summary>The team's two email switches (docs/detailed-designs/teams/notification-settings).</summary>
    [HttpPut("notifications")]
    public Task<TeamSettingsDto> SaveNotifications([FromBody] SaveNotificationsCommand command, CancellationToken ct) =>
        _sender.Send(command, ct);

    /// <summary>The team's coverage minimum (docs/detailed-designs/teams/coverage-minimum).</summary>
    [HttpPut("coverage")]
    public Task<TeamSettingsDto> SaveCoverage([FromBody] SaveCoverageCommand command, CancellationToken ct) =>
        _sender.Send(command, ct);

    /// <summary>The team's school calendar switch (docs/detailed-designs/teams/school-calendar, L2-059).</summary>
    [HttpPut("school-calendar")]
    public Task<TeamSettingsDto> SaveSchoolCalendar([FromBody] SaveSchoolCalendarCommand command, CancellationToken ct) =>
        _sender.Send(command, ct);
}
