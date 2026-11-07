using System.Security.Cryptography;
using Greenlit.Application.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Middleware;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            await WriteAsync(context, StatusCodes.Status400BadRequest, "Validation failed", ex.Message, errors: ex.Errors);
        }
        catch (BadRequestException ex)
        {
            await WriteAsync(context, StatusCodes.Status400BadRequest, "Bad request", ex.Message, code: ex.Code);
        }
        catch (UnauthorizedException ex)
        {
            await WriteAsync(context, StatusCodes.Status401Unauthorized, "Unauthorized", ex.Message, code: ex.Code);
        }
        catch (ForbiddenException ex)
        {
            await WriteAsync(context, StatusCodes.Status403Forbidden, "Forbidden", ex.Message, code: ex.Code);
        }
        catch (NotFoundException ex)
        {
            await WriteAsync(context, StatusCodes.Status404NotFound, "Not found", ex.Message, code: ex.Code);
        }
        catch (ConflictException ex)
        {
            await WriteAsync(context, StatusCodes.Status409Conflict, "Conflict", ex.Message, code: ex.Code);
        }
        catch (GoneException ex)
        {
            await WriteAsync(context, StatusCodes.Status410Gone, "Gone", ex.Message, code: ex.Code, extensions: ex.Extensions);
        }
        catch (ServiceUnavailableException ex)
        {
            await WriteAsync(context, StatusCodes.Status503ServiceUnavailable, "Service unavailable", ex.Message, code: ex.Code);
        }
        catch (Exception ex)
        {
            var reference = NewReference();
            _logger.LogError(ex, "Unhandled exception processing {Path}. Error reference {Reference}", context.Request.Path, reference);
            await WriteAsync(context, StatusCodes.Status500InternalServerError, "Server error", "An unexpected error occurred.",
                extensions: new Dictionary<string, object?> { ["reference"] = reference });
        }
    }

    /// <summary>A short identifier for one failure, such as <c>7F3A-91C2</c>, shown to the person and written to the log (L2-046 AC3).</summary>
    private static string NewReference()
    {
        var hex = Convert.ToHexString(RandomNumberGenerator.GetBytes(4));
        return $"{hex[..4]}-{hex[4..]}";
    }

    private static async Task WriteAsync(
        HttpContext context,
        int statusCode,
        string title,
        string detail,
        IReadOnlyDictionary<string, string[]>? errors = null,
        string? code = null,
        IReadOnlyDictionary<string, object?>? extensions = null)
    {
        if (context.Response.HasStarted) return;

        context.Response.StatusCode = statusCode;

        ProblemDetails pd = errors is not null
            ? new ValidationProblemDetails(errors.ToDictionary(kv => kv.Key, kv => kv.Value))
            : new ProblemDetails();

        pd.Status = statusCode;
        pd.Title = title;
        pd.Detail = detail;
        pd.Type = $"https://httpstatuses.io/{statusCode}";
        pd.Instance = context.Request.Path;
        if (code is not null) pd.Extensions["code"] = code;
        if (extensions is not null) foreach (var (key, value) in extensions) pd.Extensions[key] = value;

        await context.Response.WriteAsJsonAsync(pd, pd.GetType(), options: null, contentType: "application/problem+json");
    }
}
