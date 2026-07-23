// Pure, side-effect-free output comparison — deliberately whitespace-tolerant
// only at line-ends, strict everywhere else. No per-problem custom checkers
// (for multi-valid-answer problems) — out of scope for v1.
function normalize(output: string): string {
  return output
    .replace(/\r\n/g, "\n") // CRLF -> LF (defensive: expected output may have
    // been pasted from a Windows-edited file, even though program stdout
    // from a Linux container won't itself contain \r)
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, "")) // strip trailing whitespace per line
    .join("\n")
    .replace(/\n+$/, ""); // strip trailing blank lines
}

export function outputsMatch(actual: string, expected: string): boolean {
  return normalize(actual) === normalize(expected);
}
