using Azure;
using Azure.Communication.Email;
using Azure.Identity;
using Greenlit.Application.Abstractions;
using EmailMessage = Greenlit.Application.Abstractions.EmailMessage;
using AcsMessage = Azure.Communication.Email.EmailMessage;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Greenlit.Infrastructure.Email;

/// <summary>
/// Sends through Azure Communication Services Email (ADR-013) with the host's managed identity (or a developer's
/// <c>az login</c>), both the plain text and the branded HTML. Waits until the service has accepted the message;
/// a refusal throws, so the caller can undo what the message announced (ADR-006). Logs recipient and subject only.
/// The display name ("Greenlit") belongs to the sender username on the verified domain, not to the message.
/// </summary>
public sealed class AcsEmailSender : IEmailSender
{
    private readonly EmailClient _client;
    private readonly EmailOptions _options;
    private readonly ILogger<AcsEmailSender> _logger;

    public AcsEmailSender(IOptions<EmailOptions> options, ILogger<AcsEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
        if (string.IsNullOrWhiteSpace(_options.Endpoint))
            throw new InvalidOperationException($"{EmailOptions.SectionName}:Endpoint is required when {EmailOptions.SectionName}:Sender is {EmailOptions.AcsSender}.");
        if (string.IsNullOrWhiteSpace(_options.From))
            throw new InvalidOperationException($"{EmailOptions.SectionName}:From is required when {EmailOptions.SectionName}:Sender is {EmailOptions.AcsSender}.");
        _client = new EmailClient(new Uri(_options.Endpoint), new DefaultAzureCredential());
    }

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var content = new EmailContent(message.Subject) { PlainText = message.Body, Html = message.Html ?? string.Empty };
        var email = new AcsMessage(
            senderAddress: _options.From,
            recipientAddress: message.To,
            content: content);
        try
        {
            var operation = await _client.SendAsync(WaitUntil.Started, email, ct);
            _logger.LogInformation("Email to {To} handed to Azure Communication Services ({OperationId}): {Subject}", message.To, operation.Id, message.Subject);
        }
        catch (RequestFailedException ex)
        {
            _logger.LogWarning(ex, "Azure Communication Services refused the email to {To}: {Subject}", message.To, message.Subject);
            throw new InvalidOperationException("The mail service refused the message.", ex);
        }
    }
}
