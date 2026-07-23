import { runContainer, type RunContainerResult } from "./docker.js";

export const PYTHON_IMAGE = "online-judge-python:latest";

export function runPython(
  code: string,
  stdin: string,
  timeLimitMs: number,
  memoryLimitKb: number,
): Promise<RunContainerResult> {
  return runContainer({
    image: PYTHON_IMAGE,
    cmd: ["python3", "solution.py"],
    files: { "solution.py": code },
    stdin,
    timeLimitMs,
    memoryLimitKb,
  });
}
