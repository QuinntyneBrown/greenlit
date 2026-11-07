using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Greenlit.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationSwitches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "NotifyDecisions",
                table: "Teams",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyNewRequests",
                table: "Teams",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NotifyDecisions",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "NotifyNewRequests",
                table: "Teams");
        }
    }
}
