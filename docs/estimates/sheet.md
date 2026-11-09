# Estimates: sheet

| Design | Effort | Complete |
|---|---|---|
| mark-days | 9 days | 97% |
| phone-week | 7 days | 100% |
| select-days | 5 days | 100% |
| view-month | 6 days | 92% |

- Days synced across a person's teams (L2-064, ADR-016) are built: mark-days gained `DaySync` on every write path that adds or removes a day (stroke, Undo, send request, a holiday that clears days, joining), the `synced_day_locked` lock and the client-side skip; view-month gained the cell's `synced` flag, its striped "⇄" cell, its accessible name, the legend entry, and the phone week's cell and day panel. The marker on the year and person pages is deferred.
