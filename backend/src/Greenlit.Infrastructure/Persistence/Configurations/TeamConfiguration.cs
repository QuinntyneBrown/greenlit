using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Greenlit.Infrastructure.Persistence.Configurations;

public sealed class TeamConfiguration : IEntityTypeConfiguration<Team>
{
    public void Configure(EntityTypeBuilder<Team> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(120).IsRequired();
        b.Property(x => x.TimeZone).HasMaxLength(64).IsRequired();
        b.HasIndex(x => x.ManagerUserId);
        b.HasMany(x => x.Members).WithOne(m => m.Team).HasForeignKey(m => m.TeamId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Holidays).WithOne(h => h.Team).HasForeignKey(h => h.TeamId).OnDelete(DeleteBehavior.Cascade);
    }
}
