using Greenlit.Application.Abstractions;

namespace Greenlit.Application.PasswordResets;

/// <summary>The words of the password reset email, in one place.</summary>
public static class PasswordResetEmail
{
    public static EmailMessage Compose(string name, string to, string link)
    {
        var body =
            $"Hi {name},\n\n" +
            "Someone asked to reset the password for your Greenlit account.\n\n" +
            $"Choose a new password:\n{link}\n\n" +
            "The link works for one hour and only once. If you didn't ask for it, you can ignore this email.\n";
        return new EmailMessage(to, "Reset your Greenlit password", body);
    }
}
