using Greenlit.Application.Abstractions;

namespace Greenlit.Application.Invitations;

/// <summary>The words of the invitation email, in one place.</summary>
public static class InvitationEmail
{
    public static EmailMessage Compose(string teamName, string managerName, string memberName, string to, string link)
    {
        var subject = $"{managerName} invited you to {teamName} on Greenlit";
        var body =
            $"Hi {memberName},\n\n" +
            $"{managerName} added you to {teamName} on Greenlit, where the team shares its time off.\n\n" +
            $"Set a password and join the team:\n{link}\n\n" +
            "The link works for seven days. If it has expired, ask " + managerName + " to send you a new one.\n";
        return new EmailMessage(to, subject, body);
    }
}
