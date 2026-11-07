using FluentAssertions;
using Greenlit.Cli.Seed;
using Greenlit.Domain.Enums;
using Greenlit.Infrastructure.Authentication;
using Greenlit.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Greenlit.Cli.Tests.Seed;

/// <summary>
/// The demo seed is the mocks' cast (docs/mocks/README.md): Design team in
/// Europe/London with the UK holidays and the November days of
/// pages/calendar/default, so the e2e calendar shows what the mock shows.
/// </summary>
public class SeedCommandHandlerTests
{
    [Fact]
    public async Task Seeding_twice_leaves_one_design_team_with_the_cast()
    {
        var options = await SeedTwiceAsync();

        await using var read = new AppDbContext(options);
        var team = await read.Teams.Include(t => t.Members).SingleAsync();
        team.Name.Should().Be(SeedCommandHandler.DemoTeamName);
        team.TimeZone.Should().Be("Europe/London");
        team.Members.OrderBy(m => m.SortOrder).Select(m => m.Name).Should().Equal(
            "Maya Chen", "Ana Ruiz", "Ben Okafor", "Cleo Park", "Dev Patel", "Elif Yılmaz", "Finn Murphy");
        (await read.Users.CountAsync()).Should().Be(14);
        (await read.Holidays.CountAsync()).Should().Be(8);
    }

    [Fact]
    public async Task The_design_team_wants_four_of_its_seven_in_as_the_mocks_show()
    {
        // Journey 8: approving can warn "below your minimum of 4" (notifications/request-toast/warning).
        var options = await SeedTwiceAsync();

        await using var read = new AppDbContext(options);
        (await read.Teams.SingleAsync()).CoverageMinimum.Should().Be(4);
    }

    [Fact]
    public async Task The_manager_and_a_member_have_stable_ids_for_the_e2e_session()
    {
        var options = await SeedTwiceAsync();

        await using var read = new AppDbContext(options);
        var team = await read.Teams.SingleAsync();
        team.ManagerUserId.Should().Be(SeedCommandHandler.MayaUserId);
        var ana = await read.TeamMembers.SingleAsync(m => m.Name == "Ana Ruiz");
        ana.UserId.Should().Be(SeedCommandHandler.AnaUserId);
        (await read.Users.SingleAsync(u => u.Id == SeedCommandHandler.MayaUserId)).Email.Should().Be(SeedCommandHandler.DemoManagerEmail);
    }

    [Fact]
    public async Task Seven_newcomers_have_accounts_on_no_team_to_create_one_with()
    {
        // Journey 3: create-team needs signed-in people who are not on a team yet; journey 5: so does the invite spec.
        var options = await SeedTwiceAsync();

        await using var read = new AppDbContext(options);
        var newcomers = await read.Users
            .Where(u => !read.TeamMembers.Any(m => m.UserId == u.Id) && !read.Teams.Any(t => t.ManagerUserId == u.Id))
            .OrderBy(u => u.Email)
            .Select(u => u.Email)
            .ToListAsync();
        newcomers.Should().Equal(
            "noor@northwind.studio", "priya@northwind.studio", "sam@northwind.studio", "tomas@northwind.studio",
            "uma@northwind.studio", "vic@northwind.studio", "wren@northwind.studio");
    }

    [Fact]
    public async Task Every_demo_account_signs_in_with_the_demo_password()
    {
        // Journey 2: the e2e suite signs in through the sign-in page as a seeded person.
        var options = await SeedTwiceAsync();

        await using var read = new AppDbContext(options);
        var hasher = new IdentityPasswordHasher();
        var users = await read.Users.ToListAsync();
        users.Should().HaveCount(14).And.OnlyContain(u => hasher.Verify(u, u.PasswordHash, SeedCommandHandler.DemoPassword));
        users.Select(u => u.PasswordHash).Should().OnlyHaveUniqueItems("each hash has its own salt");
    }

    [Fact]
    public async Task Seeding_never_replaces_a_password_someone_has_set()
    {
        var options = await SeedTwiceAsync();
        var hasher = new IdentityPasswordHasher();
        await using (var db = new AppDbContext(options))
        {
            var maya = await db.Users.SingleAsync(u => u.Id == SeedCommandHandler.MayaUserId);
            maya.PasswordHash = hasher.Hash(maya, "my-own-password");
            await db.SaveChangesAsync();
        }

        await using (var db = new AppDbContext(options))
        {
            await new SeedCommandHandler(db, NullLogger<SeedCommandHandler>.Instance).ExecuteAsync(CancellationToken.None);
        }

        await using var read = new AppDbContext(options);
        var after = await read.Users.SingleAsync(u => u.Id == SeedCommandHandler.MayaUserId);
        hasher.Verify(after, after.PasswordHash, "my-own-password").Should().BeTrue();
    }

    [Fact]
    public async Task November_matches_the_calendar_mock()
    {
        var options = await SeedTwiceAsync();

        await using var read = new AppDbContext(options);
        var days = await read.TimeOffDays.Include(d => d.TeamMember)
            .Select(d => new { d.TeamMember.Name, d.Date, d.Status })
            .ToListAsync();
        days = days.Where(d => d.Date.Year == 2026 && d.Date.Month == 11).ToList();
        days.Where(d => d.Name == "Ana Ruiz").Select(d => (d.Date.Day, d.Status)).Should().BeEquivalentTo(new[]
        {
            (4, DayStatus.Confirmed), (5, DayStatus.Confirmed),
            (16, DayStatus.Requested), (17, DayStatus.Requested), (18, DayStatus.Requested), (19, DayStatus.Requested), (20, DayStatus.Requested),
        });
        days.Where(d => d.Name == "Ben Okafor").Should().HaveCount(5).And.OnlyContain(d => d.Status == DayStatus.Tentative);
        days.Where(d => d.Name == "Cleo Park").Select(d => d.Date.Day).Should().BeEquivalentTo(new[] { 12, 13 });
        days.Where(d => d.Name == "Dev Patel").Select(d => d.Date.Day).Should().BeEquivalentTo(new[] { 18, 19 });
        days.Should().HaveCount(16);
    }

    [Fact]
    public async Task The_ledger_matches_the_requests_mocks()
    {
        var options = await SeedTwiceAsync();

        await using var read = new AppDbContext(options);
        var requests = (await read.TimeOffRequests.Include(r => r.TeamMember).Include(r => r.Days).ToListAsync())
            .OrderBy(r => r.FirstDay)
            .Select(r => new { r.TeamMember.Name, r.FirstDay, r.LastDay, r.Note, r.Status, r.DeclineReason, r.DecidedUtc, Days = r.Days.Count })
            .ToList();

        var pending = requests.Where(r => r.Status == RequestStatus.Pending).ToList();
        pending.Select(r => (r.Name, r.FirstDay.Month, r.FirstDay.Day, r.LastDay.Day, r.Days, r.Note)).Should().Equal(
            ("Cleo Park", 11, 12, 13, 2, "Long weekend away"),
            ("Ana Ruiz", 11, 16, 20, 5, "Visiting family in Seville"),
            ("Dev Patel", 11, 18, 19, 2, "Moving flat"),
            ("Elif Yılmaz", 12, 29, 31, 3, "Winter break"));

        requests.Where(r => r.Status == RequestStatus.Approved)
            .Select(r => (r.Name, r.FirstDay.Month, r.FirstDay.Day, r.LastDay.Day, r.Days)).Should().Equal(
                ("Cleo Park", 9, 7, 11, 5), ("Dev Patel", 10, 12, 15, 4), ("Finn Murphy", 10, 19, 23, 5));
        requests.Where(r => r.Status == RequestStatus.Approved).Should().OnlyContain(r => r.DecidedUtc != null);

        var declined = requests.Single(r => r.Status == RequestStatus.Declined);
        (declined.Name, declined.FirstDay.Month, declined.FirstDay.Day, declined.LastDay.Day, declined.Days).Should().Be(("Ben Okafor", 12, 21, 24, 4));
        declined.DeclineReason.Should().Be("Three people are already out that week. Could you take the 29th onward instead?");
        var cancelled = requests.Single(r => r.Status == RequestStatus.Cancelled);
        (cancelled.Name, cancelled.FirstDay.Month, cancelled.FirstDay.Day, cancelled.LastDay.Day, cancelled.Days).Should().Be(("Ana Ruiz", 10, 5, 6, 0));
        requests.Should().HaveCount(9);
    }

    private static async Task<DbContextOptions<AppDbContext>> SeedTwiceAsync()
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options;

        await using (var db = new AppDbContext(options))
        {
            await db.EnsureSqliteSchemaAsync();
        }

        for (var i = 0; i < 2; i++)
        {
            await using var db = new AppDbContext(options);
            var exit = await new SeedCommandHandler(db, NullLogger<SeedCommandHandler>.Instance).ExecuteAsync(CancellationToken.None);
            exit.Should().Be(0);
        }

        return options;
    }
}
