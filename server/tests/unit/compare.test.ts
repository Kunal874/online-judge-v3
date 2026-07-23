import { describe, expect, it } from "vitest";
import { outputsMatch } from "../../src/judge/compare.js";

describe("outputsMatch", () => {
  it("matches identical output", () => {
    expect(outputsMatch("1\n2\n3", "1\n2\n3")).toBe(true);
  });

  it("ignores trailing whitespace on a line", () => {
    expect(outputsMatch("Hello World   ", "Hello World")).toBe(true);
    expect(outputsMatch("Hello\t\nWorld", "Hello\nWorld")).toBe(true);
  });

  it("ignores trailing blank lines", () => {
    expect(outputsMatch("1\n2\n3\n\n\n", "1\n2\n3")).toBe(true);
    expect(outputsMatch("1\n2\n3", "1\n2\n3\n")).toBe(true);
  });

  it("treats CRLF and LF line endings the same", () => {
    expect(outputsMatch("1\r\n2\r\n3", "1\n2\n3")).toBe(true);
  });

  it("is strict about internal whitespace", () => {
    expect(outputsMatch("1  2", "1 2")).toBe(false);
  });

  it("is strict about leading whitespace", () => {
    expect(outputsMatch("  Hello", "Hello")).toBe(false);
  });

  it("is strict about blank lines in the middle of output", () => {
    expect(outputsMatch("1\n\n3", "1\n3")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(outputsMatch("Fizz", "fizz")).toBe(false);
  });

  it("rejects genuinely different content", () => {
    expect(outputsMatch("Wrong Answer", "Correct Answer")).toBe(false);
  });

  it("treats empty and whitespace-only output as equal", () => {
    expect(outputsMatch("", "")).toBe(true);
    expect(outputsMatch("   \n  \n", "")).toBe(true);
  });
});
