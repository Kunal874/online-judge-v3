import { describe, expect, it } from "vitest";
import { computeVerdict } from "../../src/judge/verdict.js";
import type { RunContainerResult } from "../../src/judge/docker.js";

function result(overrides: Partial<RunContainerResult> = {}): RunContainerResult {
  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
    timedOut: false,
    oomKilled: false,
    durationMs: 10,
    compileError: null,
    ...overrides,
  };
}

describe("computeVerdict", () => {
  it("accepts matching output", () => {
    expect(computeVerdict(result({ stdout: "3\n" }), "3")).toBe("ACCEPTED");
  });

  it("returns WRONG_ANSWER on mismatched output", () => {
    expect(computeVerdict(result({ stdout: "4\n" }), "3")).toBe("WRONG_ANSWER");
  });

  it("returns COMPILE_ERROR when compilation failed", () => {
    expect(computeVerdict(result({ compileError: "error: expected ';'" }), "3")).toBe(
      "COMPILE_ERROR",
    );
  });

  it("returns TIME_LIMIT_EXCEEDED when the run timed out", () => {
    expect(computeVerdict(result({ timedOut: true }), "3")).toBe("TIME_LIMIT_EXCEEDED");
  });

  it("returns MEMORY_LIMIT_EXCEEDED when the kernel OOM-killed it", () => {
    expect(computeVerdict(result({ oomKilled: true }), "3")).toBe("MEMORY_LIMIT_EXCEEDED");
  });

  it("returns RUNTIME_ERROR on a non-zero exit", () => {
    expect(computeVerdict(result({ exitCode: 1, stderr: "Traceback..." }), "3")).toBe(
      "RUNTIME_ERROR",
    );
  });

  it("treats a null exit code as a runtime error rather than accepting it", () => {
    expect(computeVerdict(result({ exitCode: null }), "")).toBe("RUNTIME_ERROR");
  });

  // Precedence matters: a compile failure means nothing ran, so whatever
  // else the (placeholder) result says about the run is meaningless.
  it("prefers COMPILE_ERROR over every other signal", () => {
    const everythingWrong = result({
      compileError: "error",
      timedOut: true,
      oomKilled: true,
      exitCode: 1,
    });
    expect(computeVerdict(everythingWrong, "3")).toBe("COMPILE_ERROR");
  });

  it("prefers TIME_LIMIT_EXCEEDED over OOM and a bad exit code", () => {
    expect(computeVerdict(result({ timedOut: true, oomKilled: true, exitCode: 1 }), "3")).toBe(
      "TIME_LIMIT_EXCEEDED",
    );
  });

  it("prefers MEMORY_LIMIT_EXCEEDED over a bad exit code", () => {
    // An OOM kill usually also produces a non-zero exit; reporting that as a
    // generic runtime error would hide the real cause.
    expect(computeVerdict(result({ oomKilled: true, exitCode: 137 }), "3")).toBe(
      "MEMORY_LIMIT_EXCEEDED",
    );
  });

  it("does not accept correct-looking output from a crashed program", () => {
    expect(computeVerdict(result({ stdout: "3", exitCode: 1 }), "3")).toBe("RUNTIME_ERROR");
  });
});
