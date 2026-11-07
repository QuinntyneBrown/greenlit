using System.Globalization;
using Greenlit.Application.Abstractions;

namespace Greenlit.Application.Requests;

/// <summary>The words of the decision email for an approval, in one place.</summary>
public static class ApprovalEmail
{
    public static EmailMessage Compose(string to, string memberName, string managerName, DateOnly first, DateOnly last)
    {
        var body =
            $"Hi {memberName},\n\n" +
            $"{managerName} approved your request for {RangeLabel(first, last)}. It is on the calendar in green.\n\n" +
            "If your plans change, tell " + managerName + " and they can put it back.\n";
        return new EmailMessage(to, "Your time off was approved", body);
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
