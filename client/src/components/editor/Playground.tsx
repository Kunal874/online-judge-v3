import { useState } from "react";
import { Link } from "react-router-dom";
import type { Language, PublicProblemDetail } from "@online-judge/shared";
import CodeEditor from "./CodeEditor";
import { LANGUAGE_STUBS } from "../../lib/languageStubs";
import { useRunJob } from "../../hooks/useRunJob";
import { useSubmission } from "../../hooks/useSubmission";
import VerdictBadge from "../submissions/VerdictBadge";
import TestCaseResultChip from "../submissions/TestCaseResultChip";

const PANEL_CLASS =
  "min-h-24 w-full rounded border border-slate-300 bg-transparent p-2 text-xs font-mono dark:border-slate-600";

interface PlaygroundProps {
  language: Language;
  problem: PublicProblemDetail;
  /** Present on a contest problem page, so the submission counts toward it. */
  contestId?: string;
}

// Mount this keyed by language so switching languages remounts it with a
// fresh stub instead of syncing editor state in an effect.
export default function Playground({ language, problem, contestId }: PlaygroundProps) {
  const [code, setCode] = useState(LANGUAGE_STUBS[language]);
  const [stdin, setStdin] = useState("");
  const { submit: submitRun, isSubmitting: isSubmittingRun, jobStatus, isRunning } = useRunJob();
  const {
    submit: submitCode,
    isSubmitting: isSubmittingCode,
    submission,
    isJudging,
  } = useSubmission(problem.id);

  function handleRun() {
    submitRun({
      language,
      code,
      stdin,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
    });
  }

  function handleSubmit() {
    submitCode({ language, code, contestId });
  }

  const result = jobStatus?.status === "completed" ? jobStatus.result : undefined;
  const busy = isSubmittingRun || isRunning || isSubmittingCode || isJudging;

  return (
    <div>
      <CodeEditor language={language} value={code} onChange={setCode} />

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs text-slate-500">Custom Input</div>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="stdin for your program"
            className={PANEL_CLASS}
          />
        </div>
        <div>
          <div className="mb-1 text-xs text-slate-500">Output</div>
          <pre className={`${PANEL_CLASS} overflow-auto whitespace-pre-wrap`}>
            {isRunning
              ? "Running..."
              : jobStatus?.status === "failed"
                ? (jobStatus.error ?? "Execution failed.")
                : result
                  ? formatResult(result)
                  : ""}
          </pre>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleRun}
          disabled={busy}
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {isRunning ? "Running..." : "Run"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={busy}
          className="rounded bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-green-600"
        >
          {isJudging ? "Judging..." : "Submit"}
        </button>
      </div>

      {submission && (
        <div className="mt-4 rounded border border-slate-200 p-3 dark:border-slate-700">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <VerdictBadge verdict={submission.verdict} />
              <span className="text-xs text-slate-500">
                {submission.passedCount}/{submission.totalCount} test cases passed
              </span>
            </div>
            <Link to={`/submissions/${submission.id}`} className="text-xs underline">
              View details
            </Link>
          </div>
          {submission.results.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {submission.results.map((r) => (
                <TestCaseResultChip key={r.orderIndex} result={r} />
              ))}
            </div>
          )}
          {submission.errorMessage && (
            <pre className="mt-2 overflow-auto rounded bg-slate-100 p-2 text-xs whitespace-pre-wrap dark:bg-slate-800">
              {submission.errorMessage}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function formatResult(result: {
  stdout: string;
  stderr: string;
  timedOut: boolean;
  oomKilled: boolean;
  exitCode: number | null;
  compileError: string | null;
}): string {
  if (result.compileError !== null) return `Compile Error\n\n${result.compileError}`;
  if (result.timedOut) return "Time Limit Exceeded";
  if (result.oomKilled) return "Memory Limit Exceeded";
  const parts: string[] = [];
  if (result.stdout) parts.push(result.stdout);
  if (result.stderr) parts.push(`--- stderr ---\n${result.stderr}`);
  if (result.exitCode !== 0) parts.push(`(exited with code ${result.exitCode})`);
  return parts.join("\n") || "(no output)";
}
