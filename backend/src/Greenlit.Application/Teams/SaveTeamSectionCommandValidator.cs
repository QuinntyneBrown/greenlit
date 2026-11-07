using FluentValidation;
using Greenlit.Domain.Enums;

namespace Greenlit.Application.Teams;

/// <summary>The Team section's field rules (L2-009 AC2); the handler checks who the members are.</summary>
public sealed class SaveTeamSectionCommandValidator : AbstractValidator<SaveTeamSectionCommand>
{
    public SaveTeamSectionCommandValidator()
    {
        RuleFor(c => c.Name)
            .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Give your team a name.")
            .Must(n => n is null || n.Trim().Length <= CreateTeamCommandValidator.MaxNameLength).WithMessage("Use 120 characters or fewer.");
        RuleFor(c => c.TimeZone)
            .Must(z => z is not null && TeamOptions.TimeZones.Contains(z)).WithMessage("Choose a time zone from the list.");
        RuleForEach(c => c.Members).ChildRules(row =>
        {
            row.RuleFor(r => r.Role)
                .Must(r => r is not null && Enum.TryParse<UserRole>(r, ignoreCase: true, out var role) && role is UserRole.Member or UserRole.Manager)
                .WithMessage("Choose Member or Manager.");
            row.RuleFor(r => r.YearlyDays)
                .Must(d => d is null || d >= 0).WithMessage("Enter 0 or more days.");
        });
    }
}
