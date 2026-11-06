using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Greenlit.Infrastructure.Persistence.Configurations;

public sealed class TimeOffDayConfiguration : IEntityTypeConfiguration<TimeOffDay>
{
    public void Configure(EntityTypeBuilder<TimeOffDay> b)
    {
        b.HasKey(x => x.Id);
        // One cell per member per day.
        b.HasIndex(x => new { x.TeamMemberId, x.Date }).IsUnique();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
    }
}
