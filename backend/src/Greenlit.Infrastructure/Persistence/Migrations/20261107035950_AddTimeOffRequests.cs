using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Greenlit.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTimeOffRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TimeOffRequestId",
                table: "TimeOffDays",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TimeOffRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FirstDay = table.Column<DateOnly>(type: "date", nullable: false),
                    LastDay = table.Column<DateOnly>(type: "date", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    CreatedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimeOffRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimeOffRequests_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimeOffDays_TimeOffRequestId",
                table: "TimeOffDays",
                column: "TimeOffRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_TimeOffRequests_TeamMemberId_Status",
                table: "TimeOffRequests",
                columns: new[] { "TeamMemberId", "Status" });

            migrationBuilder.AddForeignKey(
                name: "FK_TimeOffDays_TimeOffRequests_TimeOffRequestId",
                table: "TimeOffDays",
                column: "TimeOffRequestId",
                principalTable: "TimeOffRequests",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TimeOffDays_TimeOffRequests_TimeOffRequestId",
                table: "TimeOffDays");

            migrationBuilder.DropTable(
                name: "TimeOffRequests");

            migrationBuilder.DropIndex(
                name: "IX_TimeOffDays_TimeOffRequestId",
                table: "TimeOffDays");

            migrationBuilder.DropColumn(
                name: "TimeOffRequestId",
                table: "TimeOffDays");
        }
    }
}
