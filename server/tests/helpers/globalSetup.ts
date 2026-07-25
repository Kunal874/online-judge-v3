import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

// Integration tests run against a real Postgres — the access-control rules
// being tested (published-only filters, owner-or-admin scoping) live in
// Prisma queries, so an in-memory fake would test nothing that matters.
//
// A dedicated database, not the dev one: these tests truncate every table
// between cases, which would otherwise wipe real local data.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://judge:devpassword@localhost:5433/online_judge_test";

function maintenanceUrl(databaseUrl: string): { adminUrl: string; dbName: string } {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.replace(/^\//, "");
  // "postgres" always exists and is never the target — connecting to the
  // database you're about to CREATE isn't possible.
  url.pathname = "/postgres";
  return { adminUrl: url.toString(), dbName };
}

export default async function globalSetup() {
  const { adminUrl, dbName } = maintenanceUrl(TEST_DATABASE_URL);

  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (existing.rowCount === 0) {
      // Identifier can't be parameterized, so it's quoted rather than
      // interpolated raw. dbName comes from our own env, not user input.
      await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    }
  } finally {
    await admin.end();
  }

  // `migrate deploy` (not `migrate dev`) — applies existing migrations
  // without ever prompting or generating new ones from schema drift.
  //
  // Runs the CLI's JS entrypoint under the current node binary rather than
  // the .bin shim: the shim is a .cmd on Windows, which can only be spawned
  // through a shell, and shell:true with arguments is both deprecated
  // (DEP0190) and an injection hazard. This also sidesteps npm workspace
  // hoisting, since require.resolve finds the package wherever it landed.
  const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}
