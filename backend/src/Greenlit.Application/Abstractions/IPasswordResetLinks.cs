namespace Greenlit.Application.Abstractions;

/// <summary>Builds the link a password reset email carries; implemented in Greenlit.Infrastructure.</summary>
public interface IPasswordResetLinks
{
    string For(string token);
}
