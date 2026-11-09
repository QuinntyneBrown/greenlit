using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Sheet;

// Acceptance Test
// Traces to: L2-064 AC8; L2-058 AC2
// Description: when a person joins another team with the account they have, their days from today on are synced both
//              ways at once; past days are not copied.

/// <summary>
/// Joining back-fills synced days (L2-064 AC8, ADR-016, docs/detailed-designs/identity-and-access/accept-invitation).
/// Today is Fri 6 Nov 2026 (<see cref="FrozenClockApiFactory"/>). Omar Diaz manages Product team with Sam Chen; Maya Chen
/// invites Sam to Chen family.
/// </summary>
public class SyncedDaysOnJoiningTests : IClassFixture<FrozenClockApiFactory>
{
    private const string Password = "sams-own-password-1";
    private readonly FrozenClockApiFactory _factory;

    public SyncedDaysOnJoiningTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Joining_another_team_syncs_the_persons_future_days_both_ways()
    {
        // Given Sam's Product team days on Mon 2 Nov (past) and Tue 17 Nov, and Tue 24 Nov that Maya marked on the
        // invited row, when he joins Chen family, then Chen family shows Tue 17 as a synced day but not Mon 2, and Product
        // team shows Tue 24 as a synced day.
        var product = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Product team");
        await product.AddMemberAsync("Sam Chen");
        await product.SetPasswordAsync("Sam Chen", Password);
        await product.SetDayAsync("Sam Chen", new DateOnly(2026, 11, 2), DayStatus.Confirmed);
        await product.SetDayAsync("Sam Chen", new DateOnly(2026, 11, 17), DayStatus.Requested);
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        var invited = await family.ClientFor("Maya Chen").PostAsJsonAsync("/api/team/members",
            new { name = "Sam", email = product.EmailOf("Sam Chen"), role = "Member" });
        invited.StatusCode.Should().Be(HttpStatusCode.Created, await invited.Content.ReadAsStringAsync());
        var rowId = (await invited.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        family.TrackRow("Sam", rowId);
        await family.SetDayAsync("Sam", new DateOnly(2026, 11, 24), DayStatus.Tentative);
        var token = RecordingEmailSender.TokenIn(_factory.Emails.To(product.EmailOf("Sam Chen")).Last());

        var response = await _factory.CreateClient().PostAsJsonAsync($"/api/invitations/{token}/sign-in", new { password = Password });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        (await SyncedDatesAsync(rowId)).Should().Equal(new DateOnly(2026, 11, 17));
        (await SyncedDatesAsync(product.MemberIdOf("Sam Chen"))).Should().Equal(new DateOnly(2026, 11, 24));
    }

    private Task<List<DateOnly>> SyncedDatesAsync(Guid memberId) =>
        _factory.ReadAsync(db => db.TimeOffDays.Where(d => d.TeamMemberId == memberId && d.IsSynced).Select(d => d.Date).OrderBy(d => d).ToList());
}
