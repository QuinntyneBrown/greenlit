namespace Greenlit.Domain.Enums;

/// <summary>
/// Where a time-off request stands (docs/detailed-designs/requests/send-request): it starts
/// Pending; the manager approves or declines it and the member may cancel it while it is pending.
/// </summary>
public enum RequestStatus
{
    Pending,
    Approved,
    Declined,
    Cancelled,
}
