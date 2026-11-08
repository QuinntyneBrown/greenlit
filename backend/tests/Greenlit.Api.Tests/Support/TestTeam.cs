using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using Greenlit.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Greenlit.Api.Tests.Support;

/// <summary>
/// Arranges one team in the fixture's database: a manager, members (some with
/// accounts), days and holidays. Every team gets fresh ids, so tests sharing a
/// fixture never see each other's data.
/// </summary>
public sealed class TestTeam
{
    private readonly GreenlitApiFactory _factory;

    public Team Team { get; }
    public User Manager { get; }
    public TeamMember ManagerRow { get; }
    private readonly Dictionary<string, TeamMember> _rows = new();
    private readonly Dictionary<string, User> _users = new();

    private TestTeam(GreenlitApiFactory factory, Team team, User manager, TeamMember managerRow)
    {
        _factory = factory;
        Team = team;
        Manager = manager;
        ManagerRow = managerRow;
        _rows[managerRow.Name] = managerRow;
        _users[managerRow.Name] = manager;
    }

    /// <summary>Creates a team whose manager is the first row, named <paramref name="managerName"/>.</summary>
    public static async Task<TestTeam> CreateAsync(
        GreenlitApiFactory factory,
        string managerName = "Maya Chen",
        string timeZone = "Europe/London",
        string teamName = "Design team")
    {
        var manager = NewUser(managerName, UserRole.Manager);
        var team = new Team
        {
            Id = Guid.NewGuid(),
            Name = teamName,
            ManagerUserId = manager.Id,
            TimeZone = timeZone,
            CreatedUtc = DateTimeOffset.UtcNow,
        };
        var row = new TeamMember { Id = Guid.NewGuid(), TeamId = team.Id, Name = managerName, UserId = manager.Id, SortOrder = 0 };
        await factory.WriteAsync(db =>
        {
            db.Users.Add(manager);
            db.Teams.Add(team);
            db.TeamMembers.Add(row);
        });
        return new TestTeam(factory, team, manager, row);
    }

    /// <summary>Adds a row at the end of the sheet; with <paramref name="withAccount"/> it can sign in.</summary>
    public async Task<TeamMember> AddMemberAsync(string name, bool withAccount = true)
    {
        User? user = withAccount ? NewUser(name, UserRole.Member) : null;
        var row = new TeamMember
        {
            Id = Guid.NewGuid(),
            TeamId = Team.Id,
            Name = name,
            UserId = user?.Id,
            SortOrder = _rows.Count,
        };
        await _factory.WriteAsync(db =>
        {
            if (user is not null) db.Users.Add(user);
            db.TeamMembers.Add(row);
        });
        _rows[name] = row;
        if (user is not null) _users[name] = user;
        return row;
    }

    public Task SetDayAsync(string member, DateOnly date, DayStatus status) =>
        _factory.WriteAsync(db => db.TimeOffDays.Add(new TimeOffDay
        {
            Id = Guid.NewGuid(),
            TeamMemberId = _rows[member].Id,
            Date = date,
            Status = status,
            UpdatedUtc = DateTimeOffset.UtcNow,
        }));

    /// <summary>
    /// Stores a request the way an earlier decision would have left it. Its days are the working days of
    /// the range when <paramref name="dayStatus"/> is given, linked to the request; none when it is null.
    /// </summary>
    public async Task<Guid> AddRequestAsync(
        string member,
        DateOnly first,
        DateOnly last,
        RequestStatus status,
        string? note = null,
        DateTimeOffset? sent = null,
        DateTimeOffset? decided = null,
        string? declineReason = null,
        DayStatus? dayStatus = null)
    {
        var request = new TimeOffRequest
        {
            Id = Guid.NewGuid(),
            TeamMemberId = _rows[member].Id,
            FirstDay = first,
            LastDay = last,
            Note = note,
            Status = status,
            CreatedUtc = sent ?? DateTimeOffset.UtcNow,
            DecidedUtc = decided,
            DeclineReason = declineReason,
        };
        await _factory.WriteAsync(db =>
        {
            db.TimeOffRequests.Add(request);
            if (dayStatus is null) return;
            for (var date = first; date <= last; date = date.AddDays(1))
            {
                if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) continue;
                db.TimeOffDays.Add(new TimeOffDay
                {
                    Id = Guid.NewGuid(),
                    TeamMemberId = request.TeamMemberId,
                    Date = date,
                    Status = dayStatus.Value,
                    TimeOffRequestId = request.Id,
                    UpdatedUtc = DateTimeOffset.UtcNow,
                });
            }
        });
        return request.Id;
    }

    /// <summary>Sets the team's coverage minimum, which journey 17 lets the manager set in Settings.</summary>
    public Task SetCoverageMinimumAsync(int minimum) =>
        _factory.WriteAsync(db => db.Teams.Single(t => t.Id == Team.Id).CoverageMinimum = minimum);

    /// <summary>Gives the named person their own yearly days (otherwise the team's default applies).</summary>
    public Task SetYearlyDaysAsync(string member, int? days) =>
        _factory.WriteAsync(db => db.TeamMembers.Single(m => m.Id == _rows[member].Id).YearlyDays = days);

    /// <summary>Adds days to (or removes them from) the named person's allowance, effective on <paramref name="effective"/>.</summary>
    public Task AddAdjustmentAsync(string member, int days, DateOnly effective, string reason = "Carried over from 2025") =>
        _factory.WriteAsync(db => db.AllowanceAdjustments.Add(new AllowanceAdjustment
        {
            Id = Guid.NewGuid(),
            TeamMemberId = _rows[member].Id,
            Days = days,
            Reason = reason,
            EffectiveDate = effective,
            CreatedUtc = DateTimeOffset.UtcNow,
        }));

    /// <summary>Sets the team's allowance defaults.</summary>
    public Task SetDefaultsAsync(int yearlyDays, int leaveYearStartMonth = 1) =>
        _factory.WriteAsync(db =>
        {
            var team = db.Teams.Single(t => t.Id == Team.Id);
            team.DefaultYearlyDays = yearlyDays;
            team.LeaveYearStartMonth = leaveYearStartMonth;
        });

    /// <summary>Sets the public-holiday calendar the team was created with (<c>GB</c>, <c>IE</c>, <c>US</c>, <c>CA</c> or <c>IT</c>).</summary>
    public Task SetHolidayCountryAsync(string country) =>
        _factory.WriteAsync(db => db.Teams.Single(t => t.Id == Team.Id).HolidayCountry = country);

    public Task AddHolidayAsync(DateOnly date, string name) =>
        _factory.WriteAsync(db => db.Holidays.Add(new Holiday { Id = Guid.NewGuid(), TeamId = Team.Id, Date = date, Name = name }));

    /// <summary>The time-off requests stored for the named person, oldest first.</summary>
    public async Task<IReadOnlyList<RequestRow>> RequestsOfAsync(string member)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var id = _rows[member].Id;
        var requests = await db.TimeOffRequests.AsNoTracking().Include(r => r.Days)
            .Where(r => r.TeamMemberId == id).ToListAsync();
        return requests.OrderBy(r => r.CreatedUtc).ThenBy(r => r.FirstDay)
            .Select(r => new RequestRow(
                r.FirstDay.ToString("yyyy-MM-dd"), r.LastDay.ToString("yyyy-MM-dd"), r.Note, r.Status.ToString(), r.Days.Count))
            .ToList();
    }

    /// <summary>A user who belongs to no team.</summary>
    public static async Task<User> LoneUserAsync(GreenlitApiFactory factory)
    {
        var user = NewUser("Lone Ranger", UserRole.Member);
        await factory.WriteAsync(db => db.Users.Add(user));
        return user;
    }

    /// <summary>The id of the named person's row.</summary>
    public Guid MemberIdOf(string name) => _rows[name].Id;

    /// <summary>The named person's account email.</summary>
    public string EmailOf(string name) => _users[name].Email;

    /// <summary>Gives the named person's account <paramref name="password"/>, hashed as the API verifies it.</summary>
    public async Task SetPasswordAsync(string name, string password)
    {
        var user = _users[name];
        var hash = new PasswordHasher<User>().HashPassword(user, password);
        await _factory.WriteAsync(db => db.Users.Single(u => u.Id == user.Id).PasswordHash = hash);
    }

    /// <summary>An HTTP client signed in as the named person.</summary>
    public HttpClient ClientFor(string name) => _factory.ClientFor(_users[name]);

    private static User NewUser(string name, UserRole role) => new()
    {
        Id = Guid.NewGuid(),
        Email = $"{Guid.NewGuid():N}@example.com",
        DisplayName = name,
        PasswordHash = "not-used-by-these-tests",
        Role = role,
        CreatedUtc = DateTimeOffset.UtcNow,
    };
}

/// <summary>A stored request as the tests compare it: dates, note, status and how many days point at it.</summary>
public sealed record RequestRow(string FirstDay, string LastDay, string? Note, string Status, int Days);

public static class GreenlitApiFactoryExtensions
{
    public static async Task WriteAsync(this GreenlitApiFactory factory, Action<AppDbContext> arrange)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        arrange(db);
        await db.SaveChangesAsync();
    }

    /// <summary>A client carrying a bearer token signed with the test key for <paramref name="user"/>.</summary>
    public static HttpClient ClientFor(this GreenlitApiFactory factory, User user)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", TokenFor(user));
        return client;
    }

    public static string TokenFor(User user) => TokenFor(user, DateTime.UtcNow.AddMinutes(15));

    /// <summary>A token signed with the test key that stops working at <paramref name="expires"/> (an hour after it began when that is already past).</summary>
    public static string TokenFor(User user, DateTime expires)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GreenlitApiFactory.SigningKey));
        var token = new JwtSecurityToken(
            issuer: GreenlitApiFactory.Issuer,
            audience: GreenlitApiFactory.Audience,
            claims: [new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new Claim(ClaimTypes.Role, user.Role.ToString())],
            notBefore: expires < DateTime.UtcNow ? expires.AddHours(-1) : null,
            expires: expires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
