using Greenlit.Application.Abstractions;
using Greenlit.Application.Email;

namespace Greenlit.Application.Requests;

/// <summary>The words of the decision email for a decline, in one place (docs/mocks/emails/decline).</summary>
public static class DeclineEmail
{
    public static EmailMessage Compose(string to, string memberName, string managerName, DateOnly first, DateOnly last, string? reason, IAppLinks links)
    {
        var range = ApprovalEmail.RangeLabel(first, last);
        var hasReason = !string.IsNullOrWhiteSpace(reason);
        const string note = "Those days are back to tentative on the calendar, so you can move them or send a new request.";
        var body =
            $"Hi {memberName},\n\n" +
            $"{managerName} declined your request for {range}.\n\n" +
            (hasReason ? $"Reason: {reason}\n\n" : "") +
            "Those days are back to tentative (blue) on the calendar, so you can move them or send a new request.\n\n" +
            $"Open the calendar:\n{links.Calendar}\n";
        var html = EmailLayout.Render(
            heading: $"{range} wasn’t approved",
            bodyHtml:
                EmailLayout.Paragraph($"Hi {EmailLayout.Escape(memberName)},") +
                EmailLayout.Paragraph($"{EmailLayout.Escape(managerName)} declined your request for {EmailLayout.Strong(range)}.") +
                (hasReason ? EmailLayout.Quote(reason!) : "") +
                EmailLayout.Status("Tentative · back to blue", EmailLayout.Tentative),
            buttonLabel: "Open the calendar",
            buttonHref: links.Calendar,
            note: note,
            preheader: $"{managerName} declined your request for {range}. The days are back to tentative.",
            appOrigin: links.Origin);
        return new EmailMessage(to, "Your time off request was declined", body, html);
    }
}
