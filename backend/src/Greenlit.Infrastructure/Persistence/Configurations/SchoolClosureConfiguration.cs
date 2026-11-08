using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Greenlit.Infrastructure.Persistence.Configurations;

/// <summary>School closures (ADR-015): scoped to a team, optionally to one child; deleted outright.</summary>
public sealed class SchoolClosureConfiguration : IEntityTypeConfiguration<SchoolClosure>
{
    public void Configure(EntityTypeBuilder<SchoolClosure> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Label).HasMaxLength(120).IsRequired();
        b.HasIndex(x => new { x.TeamId, x.TeamMemberId });
        b.HasOne(x => x.Team).WithMany().HasForeignKey(x => x.TeamId).OnDelete(DeleteBehavior.Cascade);
    }
}
