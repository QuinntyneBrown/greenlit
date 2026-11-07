using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Greenlit.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DecideRequestsAndCoverageMinimum : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DecidedByUserId",
                table: "TimeOffRequests",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DecidedUtc",
                table: "TimeOffRequests",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CoverageMinimum",
                table: "Teams",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DecidedByUserId",
                table: "TimeOffRequests");

            migrationBuilder.DropColumn(
                name: "DecidedUtc",
                table: "TimeOffRequests");

            migrationBuilder.DropColumn(
                name: "CoverageMinimum",
                table: "Teams");
        }
    }
}
