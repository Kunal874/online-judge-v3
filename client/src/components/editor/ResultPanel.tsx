import { useState } from "react";
import { Link } from "react-router-dom";
import type { RunResult, SubmissionDetail } from "@online-judge/shared";
import VerdictBadge from "../submissions/VerdictBadge";
import TestCaseResultChip from "../submissions/TestCaseResultChip";

const PANEL_TEXT = "text-[13px] text-[var(--ink-muted)]";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[10px] tracking-[0.08em] uppercase opacity-60">{label}</span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

/**
 * The verdict summary line: what happened, and — when something failed —
 * which case it was. Naming the case is the whole point; "Wrong Answer"
 * without a number sends people to the submissions page to find out what
 * the panel already knew.
 */
function SubmissionSummary({ submission }: { submission: SubmissionDetail }) {
  const firstFailure = submission.results.find(
    (r) => r.verdict !== "ACCEPTED" && r.verdict !== "PENDING" && r.verdict !== "RUNNING",
  );

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <VerdictBadge verdict={submission.verdict} />
      <span className="text-[13px] tabular-nums">
        {submission.passedCount}/{submission.totalCount} passed
      </span>
      {firstFailure && (
        <span className="text-[13px] text-[var(--danger-ink)]">
          first failure on case #{firstFailure.orderIndex + 1}
        </span>
      )}
      <div className={`ml-auto flex items-center gap-4 ${PANEL_TEXT}`}>
        {submission.runtimeMs != null && <Stat label="time" value={`${submission.runtimeMs} ms`} />}
        {submission.memoryKb != null && (
          <Stat label="mem" value={`${Math.round(submission.memoryKb / 1024)} MB`} />
        )}
      </div>
    </div>
  );
}

export function SubmissionResult({ submission }: { submission: SubmissionDetail | undefined }) {
  const [selected, setSelected] = useState<number | null>(null);

  if (!submission) {
    return (
      <div className={`flex h-full items-center justify-center px-6 text-center ${PANEL_TEXT}`}>
        <p>
          Press <span className="text-[var(--ink)]">Run</span> to try your own input, or{" "}
          <span className="text-[var(--ink)]">Submit</span> to judge against every case.
        </p>
      </div>
    );
  }

  const selectedResult =
    selected != null ? submission.results.find((r) => r.orderIndex === selected) : undefined;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <SubmissionSummary submission={submission} />

      {submission.errorMessage && (
        <pre className="max-h-40 overflow-auto rounded-2xl bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] p-3 text-[12px] whitespace-pre-wrap">
          {submission.errorMessage}
        </pre>
      )}

      {submission.results.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {submission.results.map((result) => (
              <TestCaseResultChip
                key={result.orderIndex}
                result={result}
                selected={selected === result.orderIndex}
                onSelect={() =>
                  setSelected((current) =>
                    current === result.orderIndex ? null : result.orderIndex,
                  )
                }
              />
            ))}
          </div>

          {selectedResult ? (
            <div className="rounded-2xl bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] p-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px]">Case #{selectedResult.orderIndex + 1}</span>
                <VerdictBadge verdict={selectedResult.verdict} size="sm" />
                {selectedResult.runtimeMs != null && (
                  <span className={`ml-auto ${PANEL_TEXT} tabular-nums`}>
                    {selectedResult.runtimeMs} ms
                  </span>
                )}
              </div>
              {/* Hidden cases stay hidden. Reporting the verdict and the
                  timing is the most that can be said without handing over
                  the answer key. */}
              <p className={`mt-1.5 ${PANEL_TEXT}`}>
                Inputs and expected output for judged cases aren&apos;t shown — solving from the
                verdict is the exercise. Use Run with your own input to probe a suspicion.
              </p>
            </div>
          ) : (
            <p className={PANEL_TEXT}>Select a case for detail.</p>
          )}
        </>
      )}

      <Link
        to={`/submissions/${submission.id}`}
        className="mt-auto self-start text-[13px] text-[var(--accent)] underline underline-offset-4"
      >
        Open full submission
      </Link>
    </div>
  );
}

function RunOutput({
  result,
  isRunning,
  failed,
}: {
  result: RunResult | undefined;
  isRunning: boolean;
  failed?: string;
}) {
  if (isRunning) return <p className={PANEL_TEXT}>Running…</p>;
  if (failed) return <p className="text-[13px] text-[var(--danger-ink)]">{failed}</p>;
  if (!result) return <p className={PANEL_TEXT}>Output appears here.</p>;

  if (result.compileError !== null) {
    return (
      <div className="flex flex-col gap-2">
        <VerdictBadge verdict="COMPILE_ERROR" size="sm" />
        <pre className="overflow-auto rounded-2xl bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] p-2.5 text-[12px] whitespace-pre-wrap">
          {result.compileError}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={`flex flex-wrap items-center gap-3 ${PANEL_TEXT}`}>
        {result.timedOut && <VerdictBadge verdict="TIME_LIMIT_EXCEEDED" size="sm" />}
        {result.oomKilled && <VerdictBadge verdict="MEMORY_LIMIT_EXCEEDED" size="sm" />}
        <Stat label="time" value={`${result.durationMs} ms`} />
        {result.exitCode !== 0 && result.exitCode !== null && (
          <Stat label="exit" value={String(result.exitCode)} />
        )}
      </div>
      <pre className="overflow-auto rounded-2xl bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] p-2.5 text-[12px] whitespace-pre-wrap">
        {result.stdout || <span className="opacity-50">(no output)</span>}
      </pre>
      {result.stderr && (
        <pre className="overflow-auto rounded-2xl bg-[var(--danger-tint)] p-2.5 text-[12px] whitespace-pre-wrap text-[var(--danger-ink)]">
          {result.stderr}
        </pre>
      )}
    </div>
  );
}

/**
 * Custom input and its output, side by side in one tab.
 *
 * The input box used to sit permanently below the panel, costing ~110px of
 * editor height on every screen to serve a feature used occasionally. It
 * belongs with the output it feeds.
 */
export function RunPanel({
  stdin,
  onStdinChange,
  result,
  isRunning,
  failed,
}: {
  stdin: string;
  onStdinChange: (value: string) => void;
  result: RunResult | undefined;
  isRunning: boolean;
  failed?: string;
}) {
  return (
    <div className="grid h-full grid-cols-2 gap-3 overflow-y-auto p-4">
      <div className="flex min-h-0 flex-col">
        <label className="mb-1 text-[10px] tracking-[0.08em] text-[var(--ink-muted)] uppercase">
          Your input
        </label>
        <textarea
          value={stdin}
          onChange={(e) => onStdinChange(e.target.value)}
          placeholder="stdin"
          className="hairline min-h-0 flex-1 resize-none rounded-2xl bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] p-2.5 font-mono text-[12px]"
        />
      </div>
      <div className="flex min-h-0 flex-col overflow-y-auto">
        <div className="mb-1 text-[10px] tracking-[0.08em] text-[var(--ink-muted)] uppercase">
          Output
        </div>
        <RunOutput result={result} isRunning={isRunning} failed={failed} />
      </div>
    </div>
  );
}
