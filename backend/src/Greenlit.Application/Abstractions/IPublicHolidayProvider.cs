namespace Greenlit.Application.Abstractions;

/// <summary>A country's public holidays (ADR-005); implemented in Greenlit.Infrastructure.</summary>
public interface IPublicHolidayProvider
{
    /// <summary>The holidays of <paramref name="country"/> (GB, IE or US) in <paramref name="year"/>, in date order.</summary>
    IReadOnlyList<PublicHoliday> For(string country, int year);
}

public sealed record PublicHoliday(DateOnly Date, string Name);
