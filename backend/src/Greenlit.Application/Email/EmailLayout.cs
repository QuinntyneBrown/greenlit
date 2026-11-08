using System.Net;
using System.Text;

namespace Greenlit.Application.Email;

/// <summary>
/// The one place Greenlit's email look lives (L2-053, docs/detailed-designs/web-experience/branded-email): the lockup,
/// a heading, the message, one button, a muted note and the footer, all styled inline with values from the design
/// tokens (docs/design-system/tokens/tokens.css, light theme) because mail clients ignore stylesheets and drop SVG.
/// The HTML mirrors docs/mocks/emails/*; change the mocks first.
/// </summary>
public static class EmailLayout
{
    // Design tokens, light theme.
    private const string Canvas = "#f6f7f3";     // --color-bg-canvas
    private const string Surface = "#ffffff";    // --color-bg-surface
    private const string Ink = "#0f1a14";        // --color-fg-default
    private const string Muted = "#566055";      // --color-fg-muted
    private const string Border = "#dfe2da";     // --color-border-default
    private const string Subtle = "#eceee8";     // --color-bg-subtle
    private const string Accent = "#0f1a14";     // --color-accent
    private const string OnAccent = "#ffffff";   // --color-fg-on-accent
    private const string Brand = "#179c52";      // --color-brand
    private const string Sans = "Inter, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    private const string Display = "'Plus Jakarta Sans', Inter, -apple-system, 'Segoe UI', Roboto, sans-serif";

    /// <summary>The colours of the three day states, as the sheet shows them.</summary>
    public const string Confirmed = "#179c52";   // --color-status-confirmed
    public const string Requested = "#f4c430";   // --color-status-requested
    public const string Tentative = "#4a88f0";   // --color-status-tentative

    /// <summary>The mark's 3×4 grid: c is brand green, n the subtle grey.</summary>
    private static readonly string[] Mark = ["nnnc", "cncn", "ncnn"];

    /// <summary>Escapes text for HTML. Every piece of user text goes through this.</summary>
    public static string Escape(string? text) => WebUtility.HtmlEncode(text ?? string.Empty);

    /// <summary>A body paragraph; <paramref name="html"/> is already escaped or built from the helpers here.</summary>
    public static string Paragraph(string html) =>
        $"<p style=\"margin:0 0 16px;font:400 16px/1.5 {Sans};color:{Ink};\">{html}</p>";

    public static string Strong(string text) => $"<strong>{Escape(text)}</strong>";

    /// <summary>A note or reason the person wrote, quoted and escaped.</summary>
    public static string Quote(string text) =>
        $"<p style=\"margin:0 0 16px;padding:4px 0 4px 14px;border-left:3px solid {Border};font:italic 16px/1.5 {Sans};color:{Muted};\">{Escape(text)}</p>";

    /// <summary>A coloured day-state mark with its label, e.g. "Requested · waiting on you".</summary>
    public static string Status(string label, string colour) =>
        $"<p style=\"margin:0 0 16px;\"><span style=\"display:inline-block;width:12px;height:12px;border-radius:3px;background:{colour};vertical-align:-1px;margin-right:8px;\"></span>" +
        $"<span style=\"font:500 14px/1.4 {Sans};color:{Ink};\">{Escape(label)}</span></p>";

    /// <summary>The whole document. <paramref name="bodyHtml"/> is built from the helpers; the rest is escaped here.</summary>
    public static string Render(string heading, string bodyHtml, string buttonLabel, string buttonHref, string note, string preheader, string appOrigin)
    {
        var sb = new StringBuilder();
        sb.Append("<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"color-scheme\" content=\"light\"><title>")
          .Append(Escape(heading)).Append("</title></head>\n");
        sb.Append($"<body style=\"margin:0;padding:0;background:{Canvas};\">\n");
        sb.Append($"<div style=\"display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;\">{Escape(preheader)}</div>\n");
        sb.Append($"<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:{Canvas};\"><tr><td align=\"center\" style=\"padding:32px 16px;\">\n");
        sb.Append("<table role=\"presentation\" width=\"560\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:100%;max-width:560px;\">\n");
        sb.Append($"<tr><td style=\"padding:0 8px 20px;\">{Lockup()}</td></tr>\n");
        sb.Append($"<tr><td style=\"background:{Surface};border:1px solid {Border};border-radius:12px;padding:32px;\">\n");
        sb.Append($"<h1 style=\"margin:0 0 16px;font:800 24px/1.2 {Display};color:{Ink};letter-spacing:-0.01em;\">{Escape(heading)}</h1>\n");
        sb.Append(bodyHtml).Append('\n');
        sb.Append(Button(buttonLabel, buttonHref)).Append('\n');
        sb.Append($"<p style=\"margin:20px 0 0;font:400 14px/1.5 {Sans};color:{Muted};\">{Escape(note)}</p>\n");
        sb.Append("</td></tr>\n");
        var origin = appOrigin.TrimEnd('/');
        var host = origin.Replace("https://", string.Empty).Replace("http://", string.Empty);
        sb.Append($"<tr><td style=\"padding:20px 8px 0;font:400 12px/1.5 {Sans};color:{Muted};\">Greenlit · the vacation sheet your team already keeps<br><a href=\"{Escape(origin)}\" style=\"color:{Muted};\">{Escape(host)}</a></td></tr>\n");
        sb.Append("</table></td></tr></table>\n</body></html>");
        return sb.ToString();
    }

    private static string Button(string label, string href) =>
        $"<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:8px 0 0;\"><tr><td style=\"border-radius:8px;background:{Accent};\">" +
        $"<a href=\"{Escape(href)}\" style=\"display:inline-block;padding:12px 22px;font:600 16px/1.25 {Sans};color:{OnAccent};text-decoration:none;border-radius:8px;\">{Escape(label)}</a>" +
        "</td></tr></table>";

    private static string Lockup()
    {
        var rows = new StringBuilder();
        foreach (var row in Mark)
        {
            rows.Append("<tr>");
            foreach (var ch in row)
            {
                var fill = ch == 'c' ? Brand : Subtle;
                rows.Append($"<td width=\"8\" height=\"8\" style=\"width:8px;height:8px;line-height:8px;font-size:0;border-radius:2px;background:{fill};\"></td>")
                    .Append("<td width=\"3\" style=\"width:3px;font-size:0;\"></td>");
            }
            rows.Append("</tr><tr><td height=\"3\" colspan=\"8\" style=\"height:3px;font-size:0;line-height:3px;\"></td></tr>");
        }
        var mark = $"<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"border-collapse:collapse;\">{rows}</table>";
        var word = $"<span style=\"font:800 22px/1 {Display};color:{Ink};letter-spacing:-0.02em;\">greenl<span style=\"color:{Brand};\">ı</span>t</span>";
        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>" +
               $"<td style=\"vertical-align:middle;padding-right:10px;\">{mark}</td>" +
               $"<td style=\"vertical-align:middle;\">{word}</td></tr></table>";
    }
}
