using System.Globalization;
using FluentValidation;

namespace Greenlit.Application.Holidays;

/// <summary>The add-a-day-off rules (L2-037 AC2); the dialog checks the same ones before sending.</summary>
public sealed class AddHolidayCommandValidator : AbstractValidator<AddHolidayCommand>
{
    public const int MaxNameLength = 120;

    public AddHolidayCommandValidator()
    {
        RuleFor(c => c.Date)
            .Must(d => DateOnly.TryParseExact(d, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            .WithMessage("Pick a date.");
        RuleFor(c => c.Name)
            .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Give the day off a name.")
            .Must(n => n is null || n.Trim().Length <= MaxNameLength).WithMessage("Use 120 characters or fewer.");
    }
}
