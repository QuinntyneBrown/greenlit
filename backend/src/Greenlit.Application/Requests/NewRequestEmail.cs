using Greenlit.Application.Abstractions;

namespace Greenlit.Application.Requests;

/// <summary>The words of the email that tells the manager a member sent a request, in one place.</summary>
public static class NewRequestEmail
{
    public static EmailMessage Compose(string to, string managerName, string memberName, DateOnly first, DateOnly last, int days, string? note)
    {
        var body =
            $"Hi {managerName},\n\n" +
            $"{memberName} asked for {ApprovalEmail.RangeLabel(first, last)} ({days} {(days == 1 ? "day" : "days")}).\n" +
            (string.IsNullOrWhiteSpace(note) ? "" : $"\nTheir note: {note}\n") +
            "\nOpen Requests in Greenlit to approve or decline it.\n";
        return new EmailMessage(to, $"{memberName} asked for time off", body);
    }
}
