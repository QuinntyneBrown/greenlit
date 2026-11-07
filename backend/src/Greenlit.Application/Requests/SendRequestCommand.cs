using MediatR;

namespace Greenlit.Application.Requests;

/// <summary>
/// A member asks for the working days between <c>FirstDay</c> and <c>LastDay</c> (<c>yyyy-MM-dd</c>,
/// both included) with an optional note (L2-019).
/// </summary>
public sealed record SendRequestCommand(string? FirstDay, string? LastDay, string? Note) : IRequest<RequestDto>;

/// <summary>How many working days a range would take, as the dialog asks while the dates change (L2-019 AC2).</summary>
public sealed record QuoteRequestQuery(string? First, string? Last) : IRequest<QuoteDto>;

public sealed record QuoteDto(int Days);

/// <summary>A request as the client sees it; <c>Days</c> counts its working days.</summary>
public sealed record RequestDto(
    Guid Id,
    Guid MemberId,
    string MemberName,
    string FirstDay,
    string LastDay,
    int Days,
    string? Note,
    string Status,
    DateTimeOffset SentUtc);
