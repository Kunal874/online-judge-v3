import type { TestCaseResultView } from "@online-judge/shared";

const SHORT_LABEL: Record<TestCaseResultView["verdict"], string> = {
  PENDING: "·",
  RUNNING: "…",
  ACCEPTED: "AC",
  WRONG_ANSWER: "WA",
  COMPILE_ERROR: "CE",
  RUNTIME_ERROR: "RE",
  TIME_LIMIT_EXCEEDED: "TLE",
  MEMORY_LIMIT_EXCEEDED: "MLE",
  INTERNAL_ERROR: "ERR",
};

const TONE: Record<TestCaseResultView["verdict"], string> = {
  PENDING: "bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] text-[var(--ink-muted)]",
  RUNNING: "bg-[var(--accent-tint)] text-[var(--accent-ink)]",
  ACCEPTED: "bg-[var(--second-tint)] text-[var(--second-ink)]",
  WRONG_ANSWER: "bg-[var(--danger-tint)] text-[var(--danger-ink)]",
  COMPILE_ERROR: "bg-[var(--accent-tint)] text-[var(--accent-ink)]",
  RUNTIME_ERROR: "bg-[var(--danger-tint)] text-[var(--danger-ink)]",
  TIME_LIMIT_EXCEEDED: "bg-[var(--accent-tint)] text-[var(--accent-ink)]",
  MEMORY_LIMIT_EXCEEDED: "bg-[var(--accent-tint)] text-[var(--accent-ink)]",
  INTERNAL_ERROR: "bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] text-[var(--ink-muted)]",
};

/**
 * One test case, showing its number as well as its verdict. The number is
 * the point: "WA" on its own tells you that you failed, not *where*, which
 * is the difference between a result and a lead worth following.
 */
export default function TestCaseResultChip({
  result,
  selected = false,
  onSelect,
}: {
  result: TestCaseResultView;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const caseNumber = result.orderIndex + 1;
  const body = (
    <>
      <span className="opacity-55">#{caseNumber}</span>
      <span className="font-semibold">{SHORT_LABEL[result.verdict]}</span>
    </>
  );

  const shape = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] tabular-nums ${
    TONE[result.verdict]
  } ${selected ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--surface)]" : ""}`;

  const title = `Test #${caseNumber}: ${result.verdict}${
    result.runtimeMs != null ? ` · ${result.runtimeMs}ms` : ""
  }`;

  if (!onSelect) {
    return (
      <span title={title} className={shape}>
        {body}
      </span>
    );
  }

  return (
    <button type="button" title={title} onClick={onSelect} className={`${shape} cursor-pointer`}>
      {body}
    </button>
  );
}
