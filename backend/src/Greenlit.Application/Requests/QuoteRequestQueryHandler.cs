using Greenlit.Application.Abstractions;
using MediatR;

namespace Greenlit.Application.Requests;

/// <summary>Counts the working days of a range without storing anything (L2-019 AC2, AC7).</summary>
public sealed class QuoteRequestQueryHandler : IRequestHandler<QuoteRequestQuery, QuoteDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public QuoteRequestQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<QuoteDto> Handle(QuoteRequestQuery request, CancellationToken ct)
    {
        var (team, _) = await RequestCaller.FindAsync(_db, _currentUser, ct);
        var (first, last) = RequestInput.Range(request.First!, request.Last!);
        var (working, _) = await RequestCaller.WorkingDaysAsync(_db, team.Id, first, last, ct);
        return new QuoteDto(working.Count);
    }
}
