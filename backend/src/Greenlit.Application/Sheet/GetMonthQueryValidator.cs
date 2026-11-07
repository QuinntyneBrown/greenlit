using FluentValidation;

namespace Greenlit.Application.Sheet;

public sealed class GetMonthQueryValidator : AbstractValidator<GetMonthQuery>
{
    public GetMonthQueryValidator()
    {
        RuleFor(q => q.Month)
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .When(q => q.Month is not null)
            .WithMessage("Month must be yyyy-MM, for example 2026-11.");
    }
}
