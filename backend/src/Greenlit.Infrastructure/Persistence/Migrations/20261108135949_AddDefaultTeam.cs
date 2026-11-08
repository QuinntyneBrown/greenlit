using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Greenlit.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDefaultTeam : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DefaultTeamId",
                table: "Users",
                type: "uniqueidentifier",
                nullable: true);

            // Back-fill (ADR-014): every existing manager's earliest created team becomes their default.
            migrationBuilder.Sql(
                """
                UPDATE u SET DefaultTeamId = (
                    SELECT TOP 1 t.Id FROM Teams t WHERE t.ManagerUserId = u.Id ORDER BY t.CreatedUtc, t.Id)
                FROM Users u
                WHERE u.DefaultTeamId IS NULL AND EXISTS (SELECT 1 FROM Teams t WHERE t.ManagerUserId = u.Id);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultTeamId",
                table: "Users");
        }
    }
}
