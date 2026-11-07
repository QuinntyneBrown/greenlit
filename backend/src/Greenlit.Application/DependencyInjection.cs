using System.Reflection;
using FluentValidation;
using Greenlit.Application.Behaviors;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
        services.AddValidatorsFromAssembly(assembly);
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
        services.AddScoped<Greenlit.Application.Invitations.InvitationIssuer>();
        services.AddScoped<Greenlit.Application.Requests.RequestNotifier>();
        services.AddScoped<Greenlit.Application.Allowances.AllowanceCalculator>();
        services.AddScoped<Greenlit.Application.Allowances.AllowanceCalculator>();
        return services;
    }
}
