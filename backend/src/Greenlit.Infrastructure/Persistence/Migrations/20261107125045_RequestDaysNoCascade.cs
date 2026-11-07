using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Greenlit.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RequestDaysNoCascade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TimeOffDays_TimeOffRequests_TimeOffRequestId",
                table: "TimeOffDays");

            migrationBuilder.AddForeignKey(
                name: "FK_TimeOffDays_TimeOffRequests_TimeOffRequestId",
                table: "TimeOffDays",
                column: "TimeOffRequestId",
                principalTable: "TimeOffRequests",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TimeOffDays_TimeOffRequests_TimeOffRequestId",
                table: "TimeOffDays");

            migrationBuilder.AddForeignKey(
                name: "FK_TimeOffDays_TimeOffRequests_TimeOffRequestId",
                table: "TimeOffDays",
                column: "TimeOffRequestId",
                principalTable: "TimeOffRequests",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
