using FluentValidation;

namespace Greenlit.Application.Teams;

/// <summary>The create-team rules (L2-008 AC2, AC4); the page checks the team name before sending.</summary>
public sealed class CreateTeamCommandValidator : AbstractValidator<CreateTeamCommand>
{
    public const int MaxNameLength = 120;

    public CreateTeamCommandValidator()
    {
        RuleFor(c => c.Name)
            .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Give your team a name.")
            .Must(n => n is null || n.Trim().Length <= MaxNameLength).WithMessage("Use 120 characters or fewer.");
        RuleFor(c => c.TimeZone)
            .Must(z => z is not null && TeamOptions.TimeZones.Contains(z)).WithMessage("Choose a time zone from the list.");
        RuleFor(c => c.HolidayCountry)
            .Must(h => h is not null && TeamOptions.HolidayCountries.Contains(h))
            .WithMessage("Choose a public-holiday calendar from the list.");
        RuleForEach(c => c.Members).ChildRules(row =>
        {
            // Members are optional: a row without a name is left out by the handler, never refused.
            row.RuleFor(r => r.Name)
                .Must(name => name is null || name.Trim().Length <= MaxNameLength)
                .WithMessage("Use 120 characters or fewer.");
        });
    }
}
