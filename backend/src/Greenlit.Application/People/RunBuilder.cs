namespace Greenlit.Application.People;

/// <summary>One run of a person's time off: consecutive working days with the same status.</summary>
public sealed record RunDto(DateOnly First, DateOnly Last, int Days, string Status);

/// <summary>
/// Groups days into runs (docs/detailed-designs/allowances/person-page). The input holds the person's
/// working days in date order, a null status meaning a working day with nothing on it; days the person
/// does not work are left out, so a weekend or a holiday never splits a run.
/// </summary>
public static class RunBuilder
{
    public static IReadOnlyList<RunDto> Build(IEnumerable<(DateOnly Date, string? Status)> workingDays)
    {
        var runs = new List<RunDto>();
        foreach (var (date, status) in workingDays)
        {
            if (status is null) { runs.Add(new RunDto(date, date, 0, string.Empty)); continue; }
            if (runs.Count > 0 && runs[^1].Status == status)
                runs[^1] = runs[^1] with { Last = date, Days = runs[^1].Days + 1 };
            else
                runs.Add(new RunDto(date, date, 1, status));
        }
        return runs.Where(r => r.Days > 0).ToList();
    }
}
