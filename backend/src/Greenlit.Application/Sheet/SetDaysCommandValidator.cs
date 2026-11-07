using System.Globalization;
using FluentValidation;

namespace Greenlit.Application.Sheet;

internal static class DayInput
{
    /// <summary>A year of days is the most one stroke can cover.</summary>
    public const int MaxDates = 366;

    public static bool IsDate(string? value) =>
        DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);

    public static bool IsStatus(string? value) => value is "Tentative" or "Requested" or "Confirmed";
}

public sealed class SetDaysCommandValidator : AbstractValidator<SetDaysCommand>
{
    public SetDaysCommandValidator()
    {
        RuleFor(c => c.Dates).NotEmpty().WithMessage("Pick at least one day.");
        RuleFor(c => c.Dates!.Count).LessThanOrEqualTo(DayInput.MaxDates)
            .When(c => c.Dates is not null).WithName("Dates").WithMessage("Too many days in one change.");
        RuleForEach(c => c.Dates).Must(DayInput.IsDate).WithMessage("Dates must be yyyy-MM-dd.");
        RuleFor(c => c.Status).Must(DayInput.IsStatus!).When(c => c.Status is not null)
            .WithMessage("Status must be Tentative, Requested, Confirmed or empty to clear.");
    }
}

public sealed class RestoreDaysCommandValidator : AbstractValidator<RestoreDaysCommand>
{
    public RestoreDaysCommandValidator()
    {
        RuleFor(c => c.Days).NotEmpty().WithMessage("Nothing to restore.");
        RuleFor(c => c.Days!.Count).LessThanOrEqualTo(DayInput.MaxDates)
            .When(c => c.Days is not null).WithName("Days").WithMessage("Too many days in one change.");
        RuleForEach(c => c.Days).ChildRules(day =>
        {
            day.RuleFor(d => d.Date).Must(DayInput.IsDate).WithMessage("Dates must be yyyy-MM-dd.");
            day.RuleFor(d => d.Status).Must(DayInput.IsStatus!).When(d => d.Status is not null)
                .WithMessage("Status must be Tentative, Requested, Confirmed or empty to clear.");
        });
    }
}
