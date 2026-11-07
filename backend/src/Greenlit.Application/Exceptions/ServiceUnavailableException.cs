namespace Greenlit.Application.Exceptions;

/// <summary>Something the request depends on, such as the mail server, did not answer; answered with 503.</summary>
public sealed class ServiceUnavailableException : Exception
{
    public string Code { get; }

    public ServiceUnavailableException(string code, string message, Exception? inner = null) : base(message, inner)
    {
        Code = code;
    }
}
