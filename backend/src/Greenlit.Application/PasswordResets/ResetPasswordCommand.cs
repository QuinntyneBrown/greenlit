using MediatR;

namespace Greenlit.Application.PasswordResets;

/// <summary>Choose a new password with a reset link (L2-003).</summary>
public sealed record ResetPasswordCommand(string? Token, string? Password, string? ConfirmPassword) : IRequest;
