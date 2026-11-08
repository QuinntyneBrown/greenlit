using Greenlit.Application.Abstractions;
using Greenlit.Application.Email;

namespace Greenlit.Application.Invitations;

/// <summary>The words of the invitation email, in one place (docs/mocks/emails/invitation).</summary>
public static class InvitationEmail
{
    public static EmailMessage Compose(string teamName, string managerName, string memberName, string to, string link, string appOrigin)
    {
        var subject = $"{managerName} invited you to {teamName} on Greenlit";
        var note = $"The link works for seven days. If it has expired, ask {managerName} to send you a new one.";
        var body =
            $"Hi {memberName},\n\n" +
            $"{managerName} added you to {teamName} on Greenlit, where the team shares its time off.\n\n" +
            $"Join the team:\n{link}\n\n" +
            note + "\n";
        var html = EmailLayout.Render(
            heading: $"Join {teamName}",
            bodyHtml:
                EmailLayout.Paragraph($"Hi {EmailLayout.Escape(memberName)},") +
                EmailLayout.Paragraph($"{EmailLayout.Escape(managerName)} added you to {EmailLayout.Strong(teamName)} on Greenlit, where the team shares its time off. Set a password, or join with Google, and your row is ready on the calendar."),
            buttonLabel: "Join the team",
            buttonHref: link,
            note: note,
            preheader: $"{managerName} added you to {teamName} on Greenlit. Join the team to share your time off.",
            appOrigin: appOrigin);
        return new EmailMessage(to, subject, body, html);
    }
}
