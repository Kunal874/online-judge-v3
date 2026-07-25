import { build } from "esbuild";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

// Runtime dependencies stay external — bcrypt is a native binding and
// Prisma ships platform-specific binaries, neither of which survives being
// inlined. @online-judge/shared is the exception: it's a workspace package
// published as raw TypeScript, so nothing downstream can consume it unless
// it's compiled in here.
const external = Object.keys(pkg.dependencies).filter((name) => name !== "@online-judge/shared");

await build({
  entryPoints: ["src/api/index.ts", "src/worker/index.ts"],
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  external,
  sourcemap: true,
  logLevel: "info",
  // Some transitive CommonJS dependencies call require() at runtime, which
  // doesn't exist in an ES module scope until it's created.
  banner: {
    js: "import{createRequire as __cr}from'node:module';const require=__cr(import.meta.url);",
  },
});
