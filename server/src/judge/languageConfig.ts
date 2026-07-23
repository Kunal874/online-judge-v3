import type { Language } from "@online-judge/shared";

export const PYTHON_IMAGE = "online-judge-python:latest";
export const GCC_IMAGE = "online-judge-gcc:latest";
export const JAVA_IMAGE = "online-judge-java:latest";

export interface ExecutionPlan {
  image: string;
  files: Record<string, string>;
  compileCmd?: string[];
  runCmd: string[];
}

// Real judges (Codeforces etc.) let a submission's public class be named
// anything rather than forcing a fixed "Main" — this mirrors that instead
// of the more brittle "always require class Main". If detection is ever
// wrong for some edge case, javac's own error ("class X is public, should
// be declared in a file named X.java") surfaces as an honest COMPILE_ERROR,
// never a silently wrong verdict.
export function detectJavaClassName(code: string): string {
  const withoutLineComments = code.replace(/\/\/.*$/gm, "");
  const match = withoutLineComments.match(/public\s+class\s+(\w+)/);
  return match?.[1] ?? "Main";
}

export function buildExecutionPlan(
  language: Language,
  code: string,
  memoryLimitKb: number,
): ExecutionPlan {
  switch (language) {
    case "PYTHON":
      return {
        image: PYTHON_IMAGE,
        files: { "solution.py": code },
        runCmd: ["python3", "solution.py"],
      };

    case "C":
      return {
        image: GCC_IMAGE,
        files: { "solution.c": code },
        compileCmd: ["gcc", "-O2", "-o", "solution", "solution.c"],
        runCmd: ["./solution"],
      };

    case "CPP":
      return {
        image: GCC_IMAGE,
        files: { "solution.cpp": code },
        compileCmd: ["g++", "-O2", "-o", "solution", "solution.cpp"],
        runCmd: ["./solution"],
      };

    case "JAVA": {
      const className = detectJavaClassName(code);
      // The JVM self-manages its heap instead of relying solely on the OOM
      // killer for a clean failure — 75% of the container's memory limit,
      // leaving headroom for JVM overhead outside the heap.
      const xmxMb = Math.max(16, Math.floor((memoryLimitKb * 0.75) / 1024));
      return {
        image: JAVA_IMAGE,
        files: { [`${className}.java`]: code },
        compileCmd: ["javac", `${className}.java`],
        runCmd: ["java", `-Xmx${xmxMb}m`, className],
      };
    }
  }
}
