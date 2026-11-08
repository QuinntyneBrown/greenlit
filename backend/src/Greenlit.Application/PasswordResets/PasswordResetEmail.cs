using Greenlit.Application.Abstractions;
using Greenlit.Application.Email;

namespace Greenlit.Application.PasswordResets;

/// <summary>The words of the password reset email, in one place (docs/mocks/emails/password-reset).</summary>
public static class PasswordResetEmail
{
    public static EmailMessage Compose(string name, string to, string link, string appOrigin)
    {
        const string note = "The link works for one hour and only once. If you didn’t ask for it, you can ignore this email and your password stays as it is.";
        var body =
            $"Hi {name},\n\n" +
            "Someone asked to reset the password for your Greenlit account.\n\n" +
            $"Choose a new password:\n{link}\n\n" +
            "The link works for one hour and only once. If you didn't ask for it, you can ignore this email.\n";
        var html = EmailLayout.Render(
            heading: "Choose a new password",
            bodyHtml:
                EmailLayout.Paragraph($"Hi {EmailLayout.Escape(name)},") +
                EmailLayout.Paragraph("Someone asked to reset the password for your Greenlit account. If that was you, choose a new one now."),
            buttonLabel: "Reset your password",
            buttonHref: link,
            note: note,
            preheader: "Choose a new password for your Greenlit account. The link works for one hour.",
            appOrigin: appOrigin);
        return new EmailMessage(to, "Reset your Greenlit password", body, html);
    }
}
