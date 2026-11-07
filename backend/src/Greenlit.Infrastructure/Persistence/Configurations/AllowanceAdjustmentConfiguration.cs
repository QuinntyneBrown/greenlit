using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Greenlit.Infrastructure.Persistence.Configurations;

public sealed class AllowanceAdjustmentConfiguration : IEntityTypeConfiguration<AllowanceAdjustment>
{
    public void Configure(EntityTypeBuilder<AllowanceAdjustment> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Reason).HasMaxLength(200).IsRequired();
        b.HasIndex(x => new { x.TeamMemberId, x.EffectiveDate });
    }
}
