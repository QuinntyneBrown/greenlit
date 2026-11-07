using System.Globalization;
using FluentValidation;
using Greenlit.Application.Exceptions;

namespace Greenlit.Application.Requests;

internal static class RequestInput
{
    /// <summary>A request cannot span more than a year (the same limit as one paint stroke).</summary>
    public const int MaxDays = 366;

    public const int NoteMaxLength = 500;

    public static bool IsDate(string? value) =>
        DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);

    public static DateOnly Parse(string value) =>
        DateOnly.ParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture);

    public static string Iso(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    /// <summary>The range rules the dialog shows: the last day on or after the first (L2-019 AC4), within a year.</summary>
    public static (DateOnly First, DateOnly Last) Range(string first, string last)
    {
        var from = Parse(first);
        var to = Parse(last);
        if (to < from)
            throw new BadRequestException("end_before_start", "The end date is before the start date.");
        if (to.DayNumber - from.DayNumber + 1 > MaxDays)
            throw new BadRequestException("range_too_long", "A request can cover at most a year.");
        return (from, to);
    }

    public static IRuleBuilderOptions<T, string?> IsRequiredDate<T>(this IRuleBuilder<T, string?> rule, string what) =>
        rule.NotEmpty().WithMessage($"Pick the {what} day.")
            .Must(IsDate).WithMessage("Dates must be yyyy-MM-dd.");
}

public sealed class SendRequestCommandValidator : AbstractValidator<SendRequestCommand>
{
    public SendRequestCommandValidator()
    {
        RuleFor(c => c.FirstDay).IsRequiredDate("first");
        RuleFor(c => c.LastDay).IsRequiredDate("last");
        RuleFor(c => c.Note).MaximumLength(RequestInput.NoteMaxLength)
            .WithMessage($"A note can be at most {RequestInput.NoteMaxLength} characters.");
    }
}

public sealed class QuoteRequestQueryValidator : AbstractValidator<QuoteRequestQuery>
{
    public QuoteRequestQueryValidator()
    {
        RuleFor(q => q.First).IsRequiredDate("first");
        RuleFor(q => q.Last).IsRequiredDate("last");
    }
}
