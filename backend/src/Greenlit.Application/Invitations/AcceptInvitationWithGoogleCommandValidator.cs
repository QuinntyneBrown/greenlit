using FluentValidation;

namespace Greenlit.Application.Invitations;

public sealed class AcceptInvitationWithGoogleCommandValidator : AbstractValidator<AcceptInvitationWithGoogleCommand>
{
    public AcceptInvitationWithGoogleCommandValidator()
    {
        RuleFor(c => c.AccessToken).NotEmpty().WithMessage("Enter a Google access token.");
    }
}
