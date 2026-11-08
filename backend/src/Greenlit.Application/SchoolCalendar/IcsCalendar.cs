using System.Globalization;
using System.Text;

namespace Greenlit.Application.SchoolCalendar;

/// <summary>One all-day event of a school's calendar file.</summary>
public sealed record IcsEvent(string Summary, DateOnly FirstDay, DateOnly LastDay);

/// <summary>
/// Reads the all-day events of an .ics file (RFC 5545) for a calendar import (L2-062, ADR-015). A small parser on
/// purpose: it unfolds lines, reads each VEVENT's SUMMARY, DTSTART and DTEND, and leaves out timed and repeating
/// events rather than guess at them. Returns null for anything that is not a readable calendar within the limits.
/// </summary>
public static class IcsCalendar
{
    /// <summary>The largest file read: 1 MB.</summary>
    public const int MaxBytes = 1_048_576;

    /// <summary>The most events a file may hold.</summary>
    public const int MaxEvents = 500;

    public const string DefaultSummary = "School closed";

    public static IReadOnlyList<IcsEvent>? Parse(string text)
    {
        if (Encoding.UTF8.GetByteCount(text) > MaxBytes) return null;
        var unfolded = text.TrimStart('﻿').Replace("\r\n ", "").Replace("\r\n\t", "").Replace("\n ", "").Replace("\n\t", "");
        var lines = unfolded.Split('\n').Select(l => l.TrimEnd('\r')).Where(l => l.Length > 0).ToList();
        if (lines.Count == 0 || !lines[0].Equals("BEGIN:VCALENDAR", StringComparison.OrdinalIgnoreCase)) return null;

        var events = new List<IcsEvent>();
        var count = 0;
        Dictionary<string, (string Params, string Value)>? current = null;
        foreach (var line in lines)
        {
            if (line.Equals("BEGIN:VEVENT", StringComparison.OrdinalIgnoreCase))
            {
                if (++count > MaxEvents) return null;
                current = new(StringComparer.OrdinalIgnoreCase);
                continue;
            }
            if (line.Equals("END:VEVENT", StringComparison.OrdinalIgnoreCase))
            {
                if (current is not null && ToEvent(current) is { } e) events.Add(e);
                current = null;
                continue;
            }
            if (current is null) continue;
            var colon = line.IndexOf(':');
            if (colon <= 0) continue;
            var head = line[..colon];
            var semicolon = head.IndexOf(';');
            var name = semicolon < 0 ? head : head[..semicolon];
            var parameters = semicolon < 0 ? string.Empty : head[(semicolon + 1)..];
            current.TryAdd(name, (parameters, line[(colon + 1)..]));
        }
        return events.Count == 0 ? null : events;
    }

    private static IcsEvent? ToEvent(Dictionary<string, (string Params, string Value)> props)
    {
        if (props.ContainsKey("RRULE")) return null;
        if (!props.TryGetValue("DTSTART", out var start) || DateOf(start) is not { } first) return null;
        var last = first;
        if (props.TryGetValue("DTEND", out var end))
        {
            // DTEND of an all-day event is the day after the last one (RFC 5545 §3.6.1).
            if (DateOf(end) is not { } exclusive) return null;
            last = exclusive.AddDays(-1);
            if (last < first) last = first;
        }
        if (last.DayNumber - first.DayNumber >= ClosureRules.MaxDays) return null;
        var summary = props.TryGetValue("SUMMARY", out var s) ? Unescape(s.Value).Trim() : string.Empty;
        if (summary.Length == 0) summary = DefaultSummary;
        if (summary.Length > ClosureRules.MaxLabel) summary = summary[..ClosureRules.MaxLabel].TrimEnd();
        return new IcsEvent(summary, first, last);
    }

    /// <summary>The date of an all-day value (VALUE=DATE, or a bare yyyyMMdd); null for a date-time.</summary>
    private static DateOnly? DateOf((string Params, string Value) prop)
    {
        var value = prop.Value.Trim();
        var isDate = prop.Params.Contains("VALUE=DATE", StringComparison.OrdinalIgnoreCase)
            && !prop.Params.Contains("VALUE=DATE-TIME", StringComparison.OrdinalIgnoreCase);
        if (!isDate && value.Length != 8) return null;
        return DateOnly.TryParseExact(value, "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : null;
    }

    private static string Unescape(string text) =>
        text.Replace("\\n", " ").Replace("\\N", " ").Replace("\\,", ",").Replace(@"\;", ";").Replace("\\\\", "\\");
}
