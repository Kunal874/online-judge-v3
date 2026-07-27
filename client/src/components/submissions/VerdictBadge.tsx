import type { Verdict } from "@online-judge/shared";

const LABELS: Record<Verdict, string> = {
  PENDING: "Queued",
  RUNNING: "Running",
  ACCEPTED: "Accepted",
  WRONG_ANSWER: "Wrong Answer",
  COMPILE_ERROR: "Compile Error",
  RUNTIME_ERROR: "Runtime Error",
  TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
  MEMORY_LIMIT_EXCEEDED: "Memory Limit Exceeded",
  INTERNAL_ERROR: "Internal Error",
};

// Sage for a pass, a warm red for a failure, muted ink while in flight.
// Deliberately not the usual green/red/amber traffic light — those hues
// belong to another palette and read as foreign against a warm ground.
const STYLES: Record<Verdict, string> = {
  PENDING: "bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] text-[var(--ink-muted)]",
  RUNNING: "bg-[var(--accent-tint)] text-[var(--accent-ink)]",
  ACCEPTED: "bg-[var(--second-tint)] text-[var(--second-ink)]",
  WRONG_ANSWER: "bg-[var(--danger-tint)] text-[var(--danger-ink)]",
  COMPILE_ERROR: "bg-[var(--accent-tint)] text-[var(--accent-ink)]",
  RUNTIME_ERROR: "bg-[var(--danger-tint)] text-[var(--danger-ink)]",
  TIME_LIMIT_EXCEEDED: "bg-[var(--accent-tint)] text-[var(--accent-ink)]",
  MEMORY_LIMIT_EXCEEDED: "bg-[var(--accent-tint)] text-[var(--accent-ink)]",
  INTERNAL_ERROR: "bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] text-[var(--ink-muted)]",
};

export default function VerdictBadge({
  verdict,
  size = "md",
}: {
  verdict: Verdict;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-medium ${STYLES[verdict]} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      }`}
    >
      {LABELS[verdict]}
    </span>
  );
}
