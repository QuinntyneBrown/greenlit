using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Greenlit.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAllowances : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DefaultYearlyDays",
                table: "Teams",
                type: "int",
                nullable: false,
                defaultValue: 25);

            migrationBuilder.AddColumn<int>(
                name: "LeaveYearStartMonth",
                table: "Teams",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "MaxCarryOver",
                table: "Teams",
                type: "int",
                nullable: false,
                defaultValue: 5);

            migrationBuilder.AddColumn<int>(
                name: "YearlyDays",
                table: "TeamMembers",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AllowanceAdjustments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Days = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EffectiveDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AllowanceAdjustments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AllowanceAdjustments_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AllowanceAdjustments_TeamMemberId_EffectiveDate",
                table: "AllowanceAdjustments",
                columns: new[] { "TeamMemberId", "EffectiveDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AllowanceAdjustments");

            migrationBuilder.DropColumn(
                name: "DefaultYearlyDays",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "LeaveYearStartMonth",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "MaxCarryOver",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "YearlyDays",
                table: "TeamMembers");
        }
    }
}
