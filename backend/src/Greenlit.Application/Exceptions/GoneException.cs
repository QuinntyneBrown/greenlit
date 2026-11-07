namespace Greenlit.Application.Exceptions;

/// <summary>The thing existed but no longer works, e.g. an invitation that was used or has expired; answered with 410.</summary>
public sealed class GoneException : Exception
{
    public string Code { get; }

    /// <summary>Extra ProblemDetails members the client needs, e.g. the manager's name.</summary>
    public IReadOnlyDictionary<string, object?> Extensions { get; }

    public GoneException(string code, string message, IReadOnlyDictionary<string, object?>? extensions = null) : base(message)
    {
        Code = code;
        Extensions = extensions ?? new Dictionary<string, object?>();
    }
}
