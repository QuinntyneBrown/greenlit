using Greenlit.Application.Abstractions;
using Greenlit.Application.Allowances;
using MediatR;

namespace Greenlit.Application.Requests;

/// <summary>Counts the working days of a range without storing anything (L2-019 AC2, AC7).</summary>
public sealed class QuoteRequestQueryHandler : IRequestHandler<QuoteRequestQuery, QuoteDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly AllowanceCalculator _allowances;

    public QuoteRequestQueryHandler(IAppDbContext db, ICurrentUser currentUser, AllowanceCalculator allowances)
    {
        _db = db;
        _currentUser = currentUser;
        _allowances = allowances;
    }

    public async Task<QuoteDto> Handle(QuoteRequestQuery request, CancellationToken ct)
    {
        var (team, member) = await RequestCaller.FindAsync(_db, _currentUser, ct);
        var (first, last) = RequestInput.Range(request.First!, request.Last!);
        var (working, _) = await RequestCaller.WorkingDaysAsync(_db, team.Id, first, last, ct);
        var mine = (await _allowances.ComputeAsync(team, [member], ct))[member.Id];
        return new QuoteDto(working.Count, mine.Available, mine.DaysOver(working.Count));
    }
}
