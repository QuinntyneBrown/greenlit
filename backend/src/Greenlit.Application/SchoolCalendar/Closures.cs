using FluentValidation;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Requests;
using Greenlit.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.SchoolCalendar;

/// <summary>A school closure as the API shows it; <c>MemberId</c> null is "All children".</summary>
public sealed record ClosureDto(Guid Id, string Label, DateOnly FirstDay, DateOnly LastDay, Guid? MemberId, bool Imported)
{
    public static ClosureDto From(SchoolClosure c) => new(c.Id, c.Label, c.FirstDay, c.LastDay, c.TeamMemberId, c.Imported);
}

/// <summary>The active team's closures, earliest first; empty while the school calendar is off (L2-059 AC4). Any member.</summary>
public sealed record GetClosuresQuery : IRequest<IReadOnlyList<ClosureDto>>;

/// <summary>Add a closure for one child, or for all children when <c>MemberId</c> is null (L2-061 AC1). Manager only.</summary>
public sealed record AddClosureCommand(string? Label, DateOnly? FirstDay, DateOnly? LastDay, Guid? MemberId) : IRequest<ClosureDto>, IClosureInput;

/// <summary>Change a closure (L2-061 AC6); an imported one becomes the manager's own (L2-062 AC3). Manager only.</summary>
public sealed record UpdateClosureCommand(Guid Id, string? Label, DateOnly? FirstDay, DateOnly? LastDay, Guid? MemberId) : IRequest<ClosureDto>, IClosureInput;

/// <summary>Delete a closure (L2-061 AC6). Manager only.</summary>
public sealed record DeleteClosureCommand(Guid Id) : IRequest<Unit>;

public interface IClosureInput
{
    string? Label { get; }
    DateOnly? FirstDay { get; }
    DateOnly? LastDay { get; }
}

/// <summary>The rules of L2-061 AC2: a label, both days, the last not before the first, at most 366 days.</summary>
public static class ClosureRules
{
    public const int MaxDays = 366;
    public const int MaxLabel = 120;

    public static void Apply<T>(AbstractValidator<T> v) where T : IClosureInput
    {
        v.RuleFor(c => c.Label).Must(l => !string.IsNullOrWhiteSpace(l)).WithMessage("Enter a name for the closure.")
            .MaximumLength(MaxLabel).WithMessage("Use 120 characters or fewer.");
        v.RuleFor(c => c.FirstDay).NotNull().WithMessage("Choose the first day.");
        v.RuleFor(c => c.LastDay).NotNull().WithMessage("Choose the last day.");
        // Separate rules: a When on a chain guards every rule before it.
        v.RuleFor(c => c.LastDay)
            .Must((c, last) => last >= c.FirstDay).When(c => c.FirstDay is not null && c.LastDay is not null)
            .WithMessage("The last day can't be before the first.");
        v.RuleFor(c => c.LastDay)
            .Must((c, last) => last!.Value.DayNumber - c.FirstDay!.Value.DayNumber < MaxDays)
            .When(c => c.FirstDay is not null && c.LastDay is not null && c.LastDay >= c.FirstDay)
            .WithMessage("A closure can be at most 366 days.");
    }

    /// <summary>The manager's team, with the school calendar on, and the closure's child (if any) one of its children.</summary>
    public static async Task<Team> ManagedTeamAsync(IAppDbContext db, ICurrentUser currentUser, Guid? memberId, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(db, currentUser, ct);
        if (!team.SchoolCalendar)
            throw new BadRequestException(SchoolCalendarRules.ChildNotAllowed, "Turn the school calendar on to add closures.");
        if (memberId is { } id && !await db.TeamMembers.AnyAsync(m => m.Id == id && m.TeamId == team.Id && m.IsChild, ct))
            throw new BadRequestException(SchoolCalendarRules.ChildNotAllowed, "Closures go on children's rows.");
        return team;
    }
}

public sealed class AddClosureCommandValidator : AbstractValidator<AddClosureCommand>
{
    public AddClosureCommandValidator() => ClosureRules.Apply(this);
}

public sealed class UpdateClosureCommandValidator : AbstractValidator<UpdateClosureCommand>
{
    public UpdateClosureCommandValidator() => ClosureRules.Apply(this);
}

public sealed class GetClosuresQueryHandler : IRequestHandler<GetClosuresQuery, IReadOnlyList<ClosureDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public GetClosuresQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<ClosureDto>> Handle(GetClosuresQuery request, CancellationToken ct)
    {
        var (team, _) = await RequestCaller.FindAsync(_db, _currentUser, ct);
        if (!team.SchoolCalendar) return [];
        return (await _db.SchoolClosures.AsNoTracking().Where(c => c.TeamId == team.Id).ToListAsync(ct))
            .OrderBy(c => c.FirstDay).ThenBy(c => c.Label).Select(ClosureDto.From).ToList();
    }
}

public sealed class AddClosureCommandHandler : IRequestHandler<AddClosureCommand, ClosureDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public AddClosureCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<ClosureDto> Handle(AddClosureCommand request, CancellationToken ct)
    {
        var team = await ClosureRules.ManagedTeamAsync(_db, _currentUser, request.MemberId, ct);
        var closure = new SchoolClosure
        {
            Id = Guid.NewGuid(),
            TeamId = team.Id,
            TeamMemberId = request.MemberId,
            Label = request.Label!.Trim(),
            FirstDay = request.FirstDay!.Value,
            LastDay = request.LastDay!.Value,
        };
        _db.SchoolClosures.Add(closure);
        await _db.SaveChangesAsync(ct);
        return ClosureDto.From(closure);
    }
}

public sealed class UpdateClosureCommandHandler : IRequestHandler<UpdateClosureCommand, ClosureDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public UpdateClosureCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<ClosureDto> Handle(UpdateClosureCommand request, CancellationToken ct)
    {
        var team = await ClosureRules.ManagedTeamAsync(_db, _currentUser, request.MemberId, ct);
        var closure = await _db.SchoolClosures.SingleOrDefaultAsync(c => c.Id == request.Id && c.TeamId == team.Id, ct)
            ?? throw new NotFoundException("Closure", request.Id);
        closure.Label = request.Label!.Trim();
        closure.FirstDay = request.FirstDay!.Value;
        closure.LastDay = request.LastDay!.Value;
        closure.TeamMemberId = request.MemberId;
        closure.Imported = false;
        await _db.SaveChangesAsync(ct);
        return ClosureDto.From(closure);
    }
}

public sealed class DeleteClosureCommandHandler : IRequestHandler<DeleteClosureCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public DeleteClosureCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(DeleteClosureCommand request, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var closure = await _db.SchoolClosures.SingleOrDefaultAsync(c => c.Id == request.Id && c.TeamId == team.Id, ct)
            ?? throw new NotFoundException("Closure", request.Id);
        _db.SchoolClosures.Remove(closure);
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}
