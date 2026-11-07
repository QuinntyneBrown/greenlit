using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Greenlit.Infrastructure.Persistence.Configurations;

public sealed class HolidayConfiguration : IEntityTypeConfiguration<Holiday>
{
    public void Configure(EntityTypeBuilder<Holiday> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(120).IsRequired();
        b.HasIndex(x => new { x.TeamId, x.Date }).IsUnique();
        // A removed holiday is invisible to every reader; the holiday handlers and the seed ignore the filter (ADR-008).
        b.HasQueryFilter(x => x.RemovedUtc == null);
    }
}
