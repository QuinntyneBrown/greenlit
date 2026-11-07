using MediatR;

namespace Greenlit.Application.Teams;

/// <summary>Removes a member from the manager's team (L2-011): soft, so their days stay as history.</summary>
public sealed record RemoveMemberCommand(Guid MemberId) : IRequest;
