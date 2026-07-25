import { defineConfig } from "vitest/config";

// Set here rather than read from server/.env so the suite is self-contained:
// CI has no .env file, and a developer's real DATABASE_URL must never be
// what the tests truncate. dotenv doesn't override already-set variables,
// so these win over .env when it does exist.
const testEnv = {
  NODE_ENV: "test",
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    "postgresql://judge:devpassword@localhost:5433/online_judge_test",
  JWT_SECRET: "test-secret-not-used-anywhere-real-but-long-enough-to-pass-validation",
  REDIS_URL: "redis://localhost:6379",
  FRONTEND_URL: "http://localhost:5173",
};

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: testEnv,
    globalSetup: ["./tests/helpers/globalSetup.ts"],
    setupFiles: ["./tests/helpers/setup.ts"],
    // Integration tests share one database and truncate it between cases,
    // so files must not run concurrently against it.
    fileParallelism: false,
  },
});
