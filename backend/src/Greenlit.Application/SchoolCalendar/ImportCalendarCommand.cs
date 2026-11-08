using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.SchoolCalendar;

/// <summary>
/// Import a school's calendar file for one child (L2-062). <c>Text</c> is the file's content; null when the upload
/// was missing or larger than <see cref="IcsCalendar.MaxBytes"/>. Manager only.
/// </summary>
public sealed record ImportCalendarCommand(Guid MemberId, string? Text) : IRequest<ImportedCalendarDto>;

/// <summary>How many closures the file added.</summary>
public sealed record ImportedCalendarDto(int Imported);

/// <summary>
/// Replaces the child's closures from earlier imports with one closure per all-day event, in one unit of work; typed
/// closures, "All children" closures and other children's rows are untouched (L2-062 AC2 to AC4). Anything unreadable
/// is <c>400 calendar_unreadable</c> and nothing changes (AC5).
/// </summary>
public sealed class ImportCalendarCommandHandler : IRequestHandler<ImportCalendarCommand, ImportedCalendarDto>
{
    public const string Unreadable = "calendar_unreadable";

    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public ImportCalendarCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<ImportedCalendarDto> Handle(ImportCalendarCommand request, CancellationToken ct)
    {
        var team = await ClosureRules.ManagedTeamAsync(_db, _currentUser, request.MemberId, ct);
        var events = request.Text is null ? null : IcsCalendar.Parse(request.Text);
        if (events is null)
            throw new BadRequestException(Unreadable, "That file isn't a calendar we can read.");

        var earlier = await _db.SchoolClosures
            .Where(c => c.TeamId == team.Id && c.TeamMemberId == request.MemberId && c.Imported)
            .ToListAsync(ct);
        _db.SchoolClosures.RemoveRange(earlier);
        foreach (var e in events)
        {
            _db.SchoolClosures.Add(new SchoolClosure
            {
                Id = Guid.NewGuid(),
                TeamId = team.Id,
                TeamMemberId = request.MemberId,
                Label = e.Summary,
                FirstDay = e.FirstDay,
                LastDay = e.LastDay,
                Imported = true,
            });
        }
        await _db.SaveChangesAsync(ct);
        return new ImportedCalendarDto(events.Count);
    }
}
