namespace Greenlit.Application.Abstractions;

/// <summary>Builds the link an invitation email carries; implemented in Greenlit.Infrastructure.</summary>
public interface IInvitationLinks
{
    string For(string token);
}
