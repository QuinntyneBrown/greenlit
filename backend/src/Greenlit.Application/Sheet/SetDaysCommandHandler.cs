using System.Globalization;
using Greenlit.Application.Abstractions;
using Greenlit.Domain.Enums;
using MediatR;

namespace Greenlit.Application.Sheet;

/// <summary>Paint a stroke (L2-015, L2-017): the rules live in <see cref="DayChanger"/> and the domain policy.</summary>
public sealed class SetDaysCommandHandler : IRequestHandler<SetDaysCommand, ChangeSetDto>
{
    private readonly DayChanger _changer;

    public SetDaysCommandHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time) =>
        _changer = new DayChanger(db, currentUser, time);

    public Task<ChangeSetDto> Handle(SetDaysCommand request, CancellationToken ct)
    {
        DayStatus? status = request.Status is null ? null : Enum.Parse<DayStatus>(request.Status);
        var targets = request.Dates!
            .Select(d => (Date: DateOnly.ParseExact(d, "yyyy-MM-dd", CultureInfo.InvariantCulture), Target: status))
            .ToList();
        return _changer.ApplyAsync(request.MemberId, targets, status, ct);
    }
}

/// <summary>Undo (L2-018 AC1): the same policy as the change it reverses.</summary>
public sealed class RestoreDaysCommandHandler : IRequestHandler<RestoreDaysCommand, ChangeSetDto>
{
    private readonly DayChanger _changer;

    public RestoreDaysCommandHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time) =>
        _changer = new DayChanger(db, currentUser, time);

    public Task<ChangeSetDto> Handle(RestoreDaysCommand request, CancellationToken ct)
    {
        var targets = request.Days!
            .Select(d => (
                Date: DateOnly.ParseExact(d.Date!, "yyyy-MM-dd", CultureInfo.InvariantCulture),
                Target: d.Status is null ? (DayStatus?)null : Enum.Parse<DayStatus>(d.Status)))
            .ToList();
        return _changer.ApplyAsync(request.MemberId, targets, null, ct);
    }
}
