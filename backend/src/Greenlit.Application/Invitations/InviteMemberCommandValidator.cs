using System.Text.RegularExpressions;
using FluentValidation;
using Greenlit.Domain.Enums;

namespace Greenlit.Application.Invitations;

/// <summary>The invite rules (L2-010 AC2); the dialog checks the same ones before sending.</summary>
public sealed partial class InviteMemberCommandValidator : AbstractValidator<InviteMemberCommand>
{
    public const int MaxNameLength = 120;
    public const int MaxEmailLength = 256;

    public InviteMemberCommandValidator()
    {
        RuleFor(c => c.Name)
            .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Enter a name.")
            .Must(n => n is null || n.Trim().Length <= MaxNameLength).WithMessage("Use 120 characters or fewer.");
        RuleFor(c => c.Email)
            .Must(e => e is not null && e.Trim().Length <= MaxEmailLength && Address().IsMatch(e.Trim()))
            .WithMessage("Enter a valid email address, like name@company.com.");
        RuleFor(c => c.Role)
            .Must(r => Enum.TryParse<UserRole>(r, ignoreCase: true, out var role) && role is UserRole.Member or UserRole.Manager)
            .WithMessage("Choose Member or Manager.");
    }

    [GeneratedRegex(@"^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$")]
    private static partial Regex Address();
}
