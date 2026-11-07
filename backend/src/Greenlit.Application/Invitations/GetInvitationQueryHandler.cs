using Greenlit.Application.Abstractions;
using MediatR;

namespace Greenlit.Application.Invitations;

/// <summary>Reads an invitation for display; changes nothing (L2-004 AC1, AC2, AC4, AC6).</summary>
public sealed class GetInvitationQueryHandler : IRequestHandler<GetInvitationQuery, InvitationSummaryDto>
{
    private readonly IAppDbContext _db;
    private readonly TimeProvider _time;

    public GetInvitationQueryHandler(IAppDbContext db, TimeProvider time)
    {
        _db = db;
        _time = time;
    }

    public async Task<InvitationSummaryDto> Handle(GetInvitationQuery request, CancellationToken ct)
    {
        var open = await InvitationLookup.FindOpenAsync(_db, _time, request.Token, ct);
        return new InvitationSummaryDto(open.Team.Name, open.ManagerName, open.Member.Name, open.Invitation.Email);
    }
}
