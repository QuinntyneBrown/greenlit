namespace Greenlit.Application.Exceptions;

/// <summary>
/// The caller could not be authenticated; surfaces as a 401 ProblemDetails
/// carrying <see cref="Code"/> (e.g. <c>invalid_credentials</c>).
/// </summary>
public sealed class UnauthorizedException : Exception
{
    public string Code { get; }

    public UnauthorizedException(string code, string message) : base(message)
    {
        Code = code;
    }
}
