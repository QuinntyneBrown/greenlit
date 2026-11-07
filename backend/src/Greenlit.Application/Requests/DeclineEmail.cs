using Greenlit.Application.Abstractions;

namespace Greenlit.Application.Requests;

/// <summary>The words of the decision email for a decline, in one place.</summary>
public static class DeclineEmail
{
    public static EmailMessage Compose(string to, string memberName, string managerName, DateOnly first, DateOnly last, string? reason)
    {
        var why = string.IsNullOrWhiteSpace(reason) ? "" : $"Reason: {reason}\n\n";
        var body =
            $"Hi {memberName},\n\n" +
            $"{managerName} declined your request for {ApprovalEmail.RangeLabel(first, last)}.\n\n" +
            why +
            "Those days are back to tentative (blue) on the calendar, so you can move them or send a new request.\n";
        return new EmailMessage(to, "Your time off request was declined", body);
    }
}
