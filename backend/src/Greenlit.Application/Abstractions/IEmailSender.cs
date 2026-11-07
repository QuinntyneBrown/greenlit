namespace Greenlit.Application.Abstractions;

/// <summary>One plain-text email.</summary>
public sealed record EmailMessage(string To, string Subject, string Body);

/// <summary>
/// Sends email; implemented in Greenlit.Infrastructure. Throws when the message cannot be
/// handed over, so callers can undo what the message announced (ADR-006).
/// </summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}
