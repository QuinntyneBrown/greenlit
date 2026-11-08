namespace Greenlit.Application.Abstractions;

/// <summary>
/// One email: <paramref name="Body"/> is the plain text, <paramref name="Html"/> the branded part
/// (L2-053). Both say the same thing and carry the same links; the log sender writes the text.
/// </summary>
public sealed record EmailMessage(string To, string Subject, string Body, string? Html = null);

/// <summary>
/// Sends email; implemented in Greenlit.Infrastructure. Throws when the message cannot be
/// handed over, so callers can undo what the message announced (ADR-006).
/// </summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}
