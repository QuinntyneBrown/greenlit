using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Greenlit.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSchoolCalendar : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "SchoolCalendar",
                table: "Teams",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsChild",
                table: "TeamMembers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "SchoolClosures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeamId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Label = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    FirstDay = table.Column<DateOnly>(type: "date", nullable: false),
                    LastDay = table.Column<DateOnly>(type: "date", nullable: false),
                    Imported = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchoolClosures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SchoolClosures_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SchoolClosures_TeamId_TeamMemberId",
                table: "SchoolClosures",
                columns: new[] { "TeamId", "TeamMemberId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SchoolClosures");

            migrationBuilder.DropColumn(
                name: "SchoolCalendar",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "IsChild",
                table: "TeamMembers");
        }
    }
}
