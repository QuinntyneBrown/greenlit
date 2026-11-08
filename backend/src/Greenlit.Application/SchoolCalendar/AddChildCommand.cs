using FluentValidation;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Invitations;
using Greenlit.Application.Requests;
using Greenlit.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.SchoolCalendar;

/// <summary>Add a child to the team: a name, and an email only for a child who will sign in (L2-060 AC2). Manager only.</summary>
public sealed record AddChildCommand(string? Name, string? Email) : IRequest<AddedChildDto>;

/// <summary>The child's row; <c>Invited</c> is true when an invitation was emailed.</summary>
public sealed record AddedChildDto(Guid Id, string Name, string? Email, bool Invited);

public sealed class AddChildCommandValidator : AbstractValidator<AddChildCommand>
{
    public AddChildCommandValidator()
    {
        RuleFor(c => c.Name).Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Enter a name.")
            .MaximumLength(120).WithMessage("Use 120 characters or fewer.");
        RuleFor(c => c.Email).EmailAddress().When(c => !string.IsNullOrWhiteSpace(c.Email))
            .WithMessage("Enter a valid email address, like name@company.com.");
    }
}

/// <summary>
/// Adds the row with the Child mark, only while the school calendar is on (<c>child_not_allowed</c> otherwise). A
/// child with an email is invited exactly as any member (L2-010, so a failed email adds nothing); a child without one
/// is only a row, who cannot sign in.
/// </summary>
public sealed class AddChildCommandHandler : IRequestHandler<AddChildCommand, AddedChildDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly ISender _sender;

    public AddChildCommandHandler(IAppDbContext db, ICurrentUser currentUser, ISender sender)
    {
        _db = db;
        _currentUser = currentUser;
        _sender = sender;
    }

    public async Task<AddedChildDto> Handle(AddChildCommand request, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        if (!team.SchoolCalendar)
            throw new BadRequestException(SchoolCalendarRules.ChildNotAllowed, "Turn the school calendar on to add children.");
        var name = request.Name!.Trim();

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var invited = await _sender.Send(new InviteMemberCommand(name, request.Email.Trim(), "Member"), ct);
            var row = await _db.TeamMembers.SingleAsync(m => m.Id == invited.Id, ct);
            row.IsChild = true;
            await _db.SaveChangesAsync(ct);
            return new AddedChildDto(row.Id, row.Name, row.Email, Invited: true);
        }

        var sortOrder = await _db.TeamMembers.IgnoreQueryFilters().Where(m => m.TeamId == team.Id).Select(m => (int?)m.SortOrder).MaxAsync(ct) ?? -1;
        var child = new TeamMember { Id = Guid.NewGuid(), TeamId = team.Id, Name = name, SortOrder = sortOrder + 1, IsChild = true };
        _db.TeamMembers.Add(child);
        await _db.SaveChangesAsync(ct);
        return new AddedChildDto(child.Id, child.Name, null, Invited: false);
    }
}
