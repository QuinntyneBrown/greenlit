using Greenlit.Application.Auth;
using MediatR;

namespace Greenlit.Application.Account;

/// <summary>Change the caller's display name and sign-in email (L2-005, docs/detailed-designs/identity-and-access/manage-account).</summary>
public sealed record UpdateProfileCommand(string? DisplayName, string? Email) : IRequest<AccountDto>;
