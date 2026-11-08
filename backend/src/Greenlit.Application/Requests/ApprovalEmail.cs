using System.Globalization;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Email;

namespace Greenlit.Application.Requests;

/// <summary>The words of the decision email for an approval, in one place (docs/mocks/emails/approval).</summary>
public static class ApprovalEmail
{
    public static EmailMessage Compose(string to, string memberName, string managerName, DateOnly first, DateOnly last, IAppLinks links)
    {
        var range = RangeLabel(first, last);
        var note = $"If your plans change, tell {managerName} and they can put it back.";
        var body =
            $"Hi {memberName},\n\n" +
            $"{managerName} approved your request for {range}. It is on the calendar in green.\n\n" +
            $"Open the calendar:\n{links.Calendar}\n\n" +
            note + "\n";
        var html = EmailLayout.Render(
            heading: $"{range} is greenlit",
            bodyHtml:
                EmailLayout.Paragraph($"Hi {EmailLayout.Escape(memberName)},") +
                EmailLayout.Paragraph($"{EmailLayout.Escape(managerName)} approved your request for {EmailLayout.Strong(range)}. It is on the calendar in green.") +
                EmailLayout.Status("Confirmed", EmailLayout.Confirmed),
            buttonLabel: "Open the calendar",
            buttonHref: links.Calendar,
            note: note,
            preheader: $"{managerName} approved your request for {range}. It is on the calendar in green.",
            appOrigin: links.Origin);
        return new EmailMessage(to, "Your time off was approved", body, html);
    }

    /// <summary>"7–11 Dec", "30 Nov–4 Dec" or "7 Dec", the style of the mocks.</summary>
    public static string RangeLabel(DateOnly first, DateOnly last)
    {
        var culture = CultureInfo.InvariantCulture;
        if (first == last) return first.ToString("d MMM", culture);
        return first.Month == last.Month && first.Year == last.Year
            ? $"{first.Day}–{last.ToString("d MMM", culture)}"
            : $"{first.ToString("d MMM", culture)}–{last.ToString("d MMM", culture)}";
    }
}
