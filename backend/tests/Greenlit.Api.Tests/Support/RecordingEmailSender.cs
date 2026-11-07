using System.Collections.Concurrent;
using Greenlit.Application.Abstractions;

namespace Greenlit.Api.Tests.Support;

/// <summary>
/// The email sender the API tests run on: it keeps every message so a test can read what was
/// sent, and can be told to fail so a test can prove what happens when sending breaks.
/// </summary>
public sealed class RecordingEmailSender : IEmailSender
{
    private readonly ConcurrentQueue<EmailMessage> _sent = new();

    public IReadOnlyCollection<EmailMessage> Sent => _sent.ToArray();

    /// <summary>While true, every send throws.</summary>
    public volatile bool Failing;

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        if (Failing) throw new InvalidOperationException("The mail server is unreachable.");
        _sent.Enqueue(message);
        return Task.CompletedTask;
    }

    /// <summary>What was sent to <paramref name="address"/>, oldest first.</summary>
    public IReadOnlyList<EmailMessage> To(string address) =>
        Sent.Where(m => string.Equals(m.To, address, StringComparison.OrdinalIgnoreCase)).ToList();

    /// <summary>The invitation token in the link of <paramref name="message"/>.</summary>
    public static string TokenIn(EmailMessage message)
    {
        var match = System.Text.RegularExpressions.Regex.Match(message.Body, @"https://app\.example\.com/accept-invite/([A-Za-z0-9_-]+)");
        if (!match.Success) throw new InvalidOperationException("No invitation link in: " + message.Body);
        return match.Groups[1].Value;
    }
}
