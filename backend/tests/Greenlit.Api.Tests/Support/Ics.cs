using System.Text;

namespace Greenlit.Api.Tests.Support;

/// <summary>Builds .ics calendar files for the import tests (RFC 5545 lines, CRLF line ends).</summary>
public static class Ics
{
    /// <summary>An all-day event: <paramref name="lastDay"/> is the last day off, so DTEND is the day after.</summary>
    public static string AllDay(string summary, string firstDay, string? lastDay = null)
    {
        var first = DateOnly.Parse(firstDay);
        var end = (lastDay is null ? first : DateOnly.Parse(lastDay)).AddDays(1);
        return $"BEGIN:VEVENT\r\nUID:{Guid.NewGuid()}@school\r\nSUMMARY:{summary}\r\nDTSTART;VALUE=DATE:{first:yyyyMMdd}\r\nDTEND;VALUE=DATE:{end:yyyyMMdd}\r\nEND:VEVENT\r\n";
    }

    /// <summary>A timed event, which the import leaves out.</summary>
    public static string Timed(string summary, string day) =>
        $"BEGIN:VEVENT\r\nUID:{Guid.NewGuid()}@school\r\nSUMMARY:{summary}\r\nDTSTART:{DateOnly.Parse(day):yyyyMMdd}T090000Z\r\nDTEND:{DateOnly.Parse(day):yyyyMMdd}T100000Z\r\nEND:VEVENT\r\n";

    /// <summary>A repeating all-day event, which the import leaves out.</summary>
    public static string Repeating(string summary, string day) =>
        $"BEGIN:VEVENT\r\nUID:{Guid.NewGuid()}@school\r\nSUMMARY:{summary}\r\nDTSTART;VALUE=DATE:{DateOnly.Parse(day):yyyyMMdd}\r\nRRULE:FREQ=WEEKLY\r\nEND:VEVENT\r\n";

    public static string Calendar(params string[] events) =>
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Maple Grove PS//EN\r\n" + string.Concat(events) + "END:VCALENDAR\r\n";

    /// <summary>A multipart body with the file under the field <c>file</c>, as the import dialog sends it.</summary>
    public static MultipartFormDataContent Upload(string text, string fileName = "maple-grove.ics")
    {
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes(text));
        file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/calendar");
        content.Add(file, "file", fileName);
        return content;
    }
}
