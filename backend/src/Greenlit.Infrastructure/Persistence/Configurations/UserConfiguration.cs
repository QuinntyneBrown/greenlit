using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Greenlit.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Email).HasMaxLength(256).IsRequired();
        b.HasIndex(x => x.Email).IsUnique();
        b.Property(x => x.DisplayName).HasMaxLength(120).IsRequired();
        b.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();
        b.Property(x => x.GoogleSubject).HasMaxLength(255);
        b.HasIndex(x => x.GoogleSubject).IsUnique().HasFilter("[GoogleSubject] IS NOT NULL");
        b.Property(x => x.Role).HasConversion<string>().HasMaxLength(32);
    }
}
