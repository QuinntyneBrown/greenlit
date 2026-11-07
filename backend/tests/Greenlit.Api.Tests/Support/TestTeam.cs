using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using Greenlit.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
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

    public Task AddHolidayAsync(DateOnly date, string name) =>
        _factory.WriteAsync(db => db.Holidays.Add(new Holiday { Id = Guid.NewGuid(), TeamId = Team.Id, Date = date, Name = name }));

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

    public static string TokenFor(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GreenlitApiFactory.SigningKey));
        var token = new JwtSecurityToken(
            issuer: GreenlitApiFactory.Issuer,
            audience: GreenlitApiFactory.Audience,
            claims: [new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new Claim(ClaimTypes.Role, user.Role.ToString())],
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
