using MediatR;

namespace Greenlit.Application.Account;

/// <summary>Change the caller's password; the current one is required (L2-005).</summary>
public sealed record ChangePasswordCommand(string? CurrentPassword, string? NewPassword, string? ConfirmPassword) : IRequest;
