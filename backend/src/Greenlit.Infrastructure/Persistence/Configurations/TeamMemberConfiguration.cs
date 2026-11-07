using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Greenlit.Infrastructure.Persistence.Configurations;

public sealed class TeamMemberConfiguration : IEntityTypeConfiguration<TeamMember>
{
    public void Configure(EntityTypeBuilder<TeamMember> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(120).IsRequired();
        b.Property(x => x.Email).HasMaxLength(256);
        b.HasIndex(x => new { x.TeamId, x.SortOrder });
        b.Property(x => x.Role).HasConversion<string>().HasMaxLength(32);
        b.HasIndex(x => x.UserId);
        b.HasMany(x => x.TimeOffDays).WithOne(d => d.TeamMember).HasForeignKey(d => d.TeamMemberId).OnDelete(DeleteBehavior.Cascade);
    }
}
