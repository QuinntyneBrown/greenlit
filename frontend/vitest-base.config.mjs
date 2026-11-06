import { defineConfig } from 'vitest/config';

// vitest's coverage.reportOnFailure defaults to false, so a run with failing
// tests writes no coverage report at all. Keep the report so a red run still
// shows what it covered.
export default defineConfig({
  test: {
    coverage: {
      reportOnFailure: true,
    },
  },
});
