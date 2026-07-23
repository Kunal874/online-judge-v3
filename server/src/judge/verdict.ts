import type { Verdict } from "@online-judge/shared";
import type { RunContainerResult } from "./docker.js";
import { outputsMatch } from "./compare.js";

// Precedence: our own timeout wins first, then the kernel's OOM signal,
// then a non-zero exit (covers segfaults/uncaught exceptions/div-by-zero
// generically, no per-language error parsing needed), then output diffing.
export function computeVerdict(result: RunContainerResult, expectedOutput: string): Verdict {
  if (result.timedOut) return "TIME_LIMIT_EXCEEDED";
  if (result.oomKilled) return "MEMORY_LIMIT_EXCEEDED";
  if (result.exitCode !== 0) return "RUNTIME_ERROR";
  return outputsMatch(result.stdout, expectedOutput) ? "ACCEPTED" : "WRONG_ANSWER";
}
