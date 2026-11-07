using Greenlit.Application.Abstractions;
using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Greenlit.Application.Requests;

/// <summary>
/// Tells a member how their request was decided (docs/detailed-designs/requests/approve-request).
/// Sent after the decision is saved, so a failing mail server never undoes it: the answer is
/// whether the message was handed over. Decision emails are always on until the Decisions switch
/// of journey 25 exists.
/// </summary>
public sealed class RequestNotifier
{
    private readonly IAppDbContext _db;
    private readonly IEmailSender _email;
    private readonly ILogger<RequestNotifier> _logger;

    public RequestNotifier(IAppDbContext db, IEmailSender email, ILogger<RequestNotifier> logger)
    {
        _db = db;
        _email = email;
        _logger = logger;
    }

    /// <summary>True when the approval email was sent; false when the member has no address or sending failed.</summary>
    public async Task<bool> ApprovedAsync(Team team, string managerName, TimeOffRequest request, CancellationToken ct)
    {
        var member = request.TeamMember;
        var address = member.Email;
        if (string.IsNullOrWhiteSpace(address) && member.UserId is { } userId)
            address = await _db.Users.AsNoTracking().Where(u => u.Id == userId).Select(u => u.Email).FirstOrDefaultAsync(ct);
        if (string.IsNullOrWhiteSpace(address)) return false;

        try
        {
            await _email.SendAsync(
                ApprovalEmail.Compose(address, member.Name, managerName, request.FirstDay, request.LastDay), ct);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "The approval email for request {RequestId} could not be sent.", request.Id);
            return false;
        }
    }
}
