using MediatR;

namespace Greenlit.Application.People;

/// <summary>Adds (or, when negative, removes) days of one member's allowance with a reason (L2-028). Manager only.</summary>
public sealed record AddAdjustmentCommand(Guid MemberId, int Days, string? Reason) : IRequest<AdjustmentDto>;
