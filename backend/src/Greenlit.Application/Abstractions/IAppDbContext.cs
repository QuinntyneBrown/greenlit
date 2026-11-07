using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<Team> Teams { get; }
    DbSet<TeamMember> TeamMembers { get; }
    DbSet<TimeOffDay> TimeOffDays { get; }
    DbSet<Holiday> Holidays { get; }
    DbSet<Invitation> Invitations { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>Forgets every pending change, e.g. after a failed save, so the next save starts clean.</summary>
    void DiscardChanges();
}
