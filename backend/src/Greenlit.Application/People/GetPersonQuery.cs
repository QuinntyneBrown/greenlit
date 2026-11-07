using Greenlit.Application.Allowances;
using MediatR;

namespace Greenlit.Application.People;

/// <summary>One person's page (L2-033): <c>Id</c> is a member's id, or null for the caller's own row.</summary>
public sealed record GetPersonQuery(Guid? Id) : IRequest<PersonDto>;

/// <summary>What a person's page shows (docs/detailed-designs/allowances/person-page).</summary>
public sealed record PersonDto(
    Guid Id,
    string Name,
    int Year,
    AllowanceFigures Allowance);
