namespace Greenlit.Infrastructure.Email;

/// <summary>Email delivery settings (ADR-013): <c>Greenlit:Email</c>.</summary>
public sealed class EmailOptions
{
    public const string SectionName = "Greenlit:Email";

    /// <summary>Writes every message to the application log (the default; development, tests and the e2e API).</summary>
    public const string LogSender = "Log";

    /// <summary>Sends through Azure Communication Services with the host's managed identity.</summary>
    public const string AcsSender = "Acs";

    public string Sender { get; set; } = LogSender;

    /// <summary>The Communication Services endpoint, e.g. <c>https://acs-greenlit-prod.unitedstates.communication.azure.com</c>.</summary>
    public string Endpoint { get; set; } = string.Empty;

    /// <summary>The From address, a sender username of a verified domain, e.g. <c>no-reply@mail.greenlit.rocks</c>.</summary>
    public string From { get; set; } = string.Empty;

    /// <summary>Informational: the display name is set on the sender username in Azure, where it is "Greenlit".</summary>
    public string FromName { get; set; } = "Greenlit";

    public bool UsesAcs => Sender.Equals(AcsSender, StringComparison.OrdinalIgnoreCase);
}
