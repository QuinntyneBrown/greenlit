using FluentValidation;

namespace Greenlit.Application.Account;

/// <summary>The profile rules; the page checks the same ones before sending.</summary>
public sealed class UpdateProfileCommandValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileCommandValidator()
    {
        RuleFor(c => c.DisplayName)
            .Must(n => !string.IsNullOrWhiteSpace(n) && n.Trim().Length <= 100)
            .WithMessage("Enter your name (up to 100 characters).");
        RuleFor(c => c.Email)
            .Must(e => !string.IsNullOrWhiteSpace(e) && e.Trim().Length <= 256 && IsAddress(e.Trim()))
            .WithMessage("Enter a valid email address.");
    }

    private static bool IsAddress(string value)
    {
        var at = value.IndexOf('@');
        return at > 0 && at == value.LastIndexOf('@') && !value.Any(char.IsWhiteSpace)
            && value[(at + 1)..].Contains('.') && !value.EndsWith('.') && !value[(at + 1)..].StartsWith('.');
    }
}
