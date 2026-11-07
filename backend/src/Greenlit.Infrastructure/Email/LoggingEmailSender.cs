using Greenlit.Application.Abstractions;
using Microsoft.Extensions.Logging;

namespace Greenlit.Infrastructure.Email;

/// <summary>
/// Writes each message to the application log instead of sending it (ADR-006): no mail
/// server is needed in development or in the e2e API.
/// </summary>
public sealed class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _logger;

    public LoggingEmailSender(ILogger<LoggingEmailSender> logger) => _logger = logger;

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        _logger.LogInformation("Email to {To}: {Subject}{NewLine}{Body}", message.To, message.Subject, Environment.NewLine, message.Body);
        return Task.CompletedTask;
    }
}
