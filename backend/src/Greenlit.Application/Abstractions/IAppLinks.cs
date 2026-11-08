namespace Greenlit.Application.Abstractions;

/// <summary>Where the app lives (<c>Greenlit:App:Origin</c>), for the links emails carry; implemented in Greenlit.Infrastructure.</summary>
public interface IAppLinks
{
    /// <summary>The app's origin without a trailing slash, e.g. <c>https://app.greenlit.rocks</c>.</summary>
    string Origin { get; }

    /// <summary>The calendar.</summary>
    string Calendar => Origin + "/";

    /// <summary>The Requests page.</summary>
    string Requests => Origin + "/requests";
}
