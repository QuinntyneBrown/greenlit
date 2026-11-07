using MediatR;

namespace Greenlit.Application.Holidays;

/// <summary>Removes a holiday of the caller's team; its date becomes a working day again (L2-038 AC2). Manager only.</summary>
public sealed record RemoveHolidayCommand(Guid Id) : IRequest;

/// <summary>Undo of a removal: the holiday comes back with its name and date (L2-038 AC3). Manager only.</summary>
public sealed record RestoreHolidayCommand(Guid Id) : IRequest<HolidayDto>;
