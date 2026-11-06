using Microsoft.EntityFrameworkCore;

namespace Greenlit.Cli.Database;

public interface IDbContextRegistrar
{
    void Configure(DbContextOptionsBuilder builder, DatabaseOptions options);
}
