using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Greenlit.Infrastructure.Persistence.Configurations;

public sealed class TimeOffRequestConfiguration : IEntityTypeConfiguration<TimeOffRequest>
{
    public const int NoteMaxLength = 500;

    public void Configure(EntityTypeBuilder<TimeOffRequest> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Note).HasMaxLength(NoteMaxLength);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
        b.HasIndex(x => new { x.TeamMemberId, x.Status });
        b.HasOne(x => x.TeamMember).WithMany(m => m.Requests).HasForeignKey(x => x.TeamMemberId).OnDelete(DeleteBehavior.Cascade);
        // A day leaves its request when the request goes; the day row itself stays until it is cleared.
        b.HasMany(x => x.Days).WithOne(d => d.TimeOffRequest).HasForeignKey(d => d.TimeOffRequestId).OnDelete(DeleteBehavior.SetNull);
    }
}
