using FluentValidation;

namespace Greenlit.Application.PasswordResets;

/// <summary>The forgot-password rule (L2-002 AC4); the page checks the same one before sending.</summary>
public sealed class RequestPasswordResetCommandValidator : AbstractValidator<RequestPasswordResetCommand>
{
    public RequestPasswordResetCommandValidator()
    {
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
