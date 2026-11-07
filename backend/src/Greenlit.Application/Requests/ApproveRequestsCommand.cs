using FluentValidation;
using MediatR;

namespace Greenlit.Application.Requests;

/// <summary>The manager approves these pending requests, all or none (L2-024).</summary>
public sealed record ApproveRequestsCommand(IReadOnlyList<Guid>? Ids) : IRequest<IReadOnlyList<ApprovalResult>>;

/// <summary>What one approval did, for the toast: the request's range and who it belongs to.</summary>
public sealed record ApprovalResult(
    Guid RequestId,
    string MemberName,
    string FirstDay,
    string LastDay,
    int Days);

public sealed class ApproveRequestsCommandValidator : AbstractValidator<ApproveRequestsCommand>
{
    public const int MaxIds = 100;

    public ApproveRequestsCommandValidator()
    {
        RuleFor(c => c.Ids).NotNull().WithMessage("Say which requests to approve.");
        RuleFor(c => c.Ids!.Count).InclusiveBetween(1, MaxIds)
            .When(c => c.Ids is not null)
            .WithMessage($"Approve between 1 and {MaxIds} requests at a time.");
    }
}
