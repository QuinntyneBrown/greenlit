using FluentAssertions;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Infrastructure.Tests.Persistence;

public class TimeOffDayPersistenceTests : IClassFixture<SqliteDbContextFixture>
{
    private readonly SqliteDbContextFixture _fixture;

    public TimeOffDayPersistenceTests(SqliteDbContextFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task A_members_day_round_trips_with_its_status()
    {
        var team = new Team
        {
            Id = Guid.NewGuid(),
            Name = "Platform",
            ManagerUserId = Guid.NewGuid(),
            TimeZone = "America/Toronto",
            CreatedUtc = DateTimeOffset.UtcNow,
        };
        var member = new TeamMember { Id = Guid.NewGuid(), Name = "Alex", SortOrder = 0 };
        team.Members.Add(member);
        member.TimeOffDays.Add(new TimeOffDay
        {
            Id = Guid.NewGuid(),
            Date = new DateOnly(2026, 12, 24),
            Status = DayStatus.Requested,
            UpdatedUtc = DateTimeOffset.UtcNow,
        });

        await using (var db = _fixture.CreateContext())
        {
            db.Teams.Add(team);
            await db.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        var day = await read.TimeOffDays.SingleAsync(d => d.TeamMemberId == member.Id);
        day.Date.Should().Be(new DateOnly(2026, 12, 24));
        day.Status.Should().Be(DayStatus.Requested);
    }

    [Fact]
    public async Task A_member_cannot_hold_the_same_day_twice()
    {
        var team = new Team { Id = Guid.NewGuid(), Name = "Ops", ManagerUserId = Guid.NewGuid(), CreatedUtc = DateTimeOffset.UtcNow };
        var member = new TeamMember { Id = Guid.NewGuid(), Name = "Blake" };
        team.Members.Add(member);
        var date = new DateOnly(2026, 7, 1);
        member.TimeOffDays.Add(new TimeOffDay { Id = Guid.NewGuid(), Date = date, Status = DayStatus.Tentative, UpdatedUtc = DateTimeOffset.UtcNow });
        member.TimeOffDays.Add(new TimeOffDay { Id = Guid.NewGuid(), Date = date, Status = DayStatus.Confirmed, UpdatedUtc = DateTimeOffset.UtcNow });

        await using var db = _fixture.CreateContext();
        db.Teams.Add(team);
        var act = () => db.SaveChangesAsync();

        await act.Should().ThrowAsync<DbUpdateException>();
    }
}
