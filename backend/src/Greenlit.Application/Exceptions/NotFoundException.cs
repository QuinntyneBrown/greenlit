namespace Greenlit.Application.Exceptions;

public sealed class NotFoundException : Exception
{
    public NotFoundException(string entity, object key)
        : base($"{entity} with id '{key}' was not found.") { }

    public NotFoundException(string message) : base(message) { }

    /// <summary>A code the client can branch on; null for the plain 404.</summary>
    public string? Code { get; init; }
}
