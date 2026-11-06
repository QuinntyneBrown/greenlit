namespace Greenlit.Domain.Entities;

/// <summary>A red day for the whole team: a statutory holiday or a company closure.</summary>
public class Holiday
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public DateOnly Date { get; set; }
    public string Name { get; set; } = string.Empty;
}
