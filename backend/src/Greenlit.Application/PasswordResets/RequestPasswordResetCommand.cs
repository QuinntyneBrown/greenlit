using MediatR;

namespace Greenlit.Application.PasswordResets;

/// <summary>Ask for a reset link by email (L2-002).</summary>
public sealed record RequestPasswordResetCommand(string? Email) : IRequest;
