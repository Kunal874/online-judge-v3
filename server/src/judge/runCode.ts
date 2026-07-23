import { runContainer, type RunContainerResult } from "./docker.js";
import { buildExecutionPlan } from "./languageConfig.js";
import type { Language } from "@online-judge/shared";

export function runCode(
  language: Language,
  code: string,
  stdin: string,
  timeLimitMs: number,
  memoryLimitKb: number,
): Promise<RunContainerResult> {
  const plan = buildExecutionPlan(language, code, memoryLimitKb);
  return runContainer({
    image: plan.image,
    files: plan.files,
    compileCmd: plan.compileCmd,
    cmd: plan.runCmd,
    stdin,
    timeLimitMs,
    memoryLimitKb,
  });
}
