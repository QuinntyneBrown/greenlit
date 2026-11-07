using FluentValidation;

namespace Greenlit.Application.Year;

public sealed class GetYearQueryValidator : AbstractValidator<GetYearQuery>
{
    public GetYearQueryValidator()
    {
        RuleFor(q => q.Year)
            .NotNull().WithMessage("Year is required, for example 2026.")
            .InclusiveBetween(2000, 2100).WithMessage("Year must be between 2000 and 2100.");
    }
}
