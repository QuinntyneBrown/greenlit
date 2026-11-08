using Greenlit.Application.Abstractions;
using Greenlit.Application.Email;

namespace Greenlit.Application.Requests;

/// <summary>The words of the email that tells the manager a member sent a request, in one place (docs/mocks/emails/new-request).</summary>
public static class NewRequestEmail
{
    public static EmailMessage Compose(string to, string managerName, string memberName, DateOnly first, DateOnly last, int days, string? note, IAppLinks links)
    {
        var range = ApprovalEmail.RangeLabel(first, last);
        var count = $"{days} {(days == 1 ? "day" : "days")}";
        var hasNote = !string.IsNullOrWhiteSpace(note);
        var body =
            $"Hi {managerName},\n\n" +
            $"{memberName} asked for {range} ({count}).\n" +
            (hasNote ? $"\nTheir note: {note}\n" : "") +
            $"\nReview the request:\n{links.Requests}\n";
        var html = EmailLayout.Render(
            heading: $"{memberName} asked for {range}",
            bodyHtml:
                EmailLayout.Paragraph($"Hi {EmailLayout.Escape(managerName)},") +
                EmailLayout.Paragraph($"{EmailLayout.Escape(memberName)} asked for {EmailLayout.Strong(range)} ({count}).") +
                EmailLayout.Status("Requested · waiting on you", EmailLayout.Requested) +
                (hasNote ? EmailLayout.Quote(note!) : ""),
            buttonLabel: "Review the request",
            buttonHref: links.Requests,
            note: "Approve or decline it from Requests. The days stay yellow on the calendar until you do.",
            preheader: $"{memberName} asked for {range} ({count}). Review it in Greenlit.",
            appOrigin: links.Origin);
        return new EmailMessage(to, $"{memberName} asked for time off", body, html);
    }
}
