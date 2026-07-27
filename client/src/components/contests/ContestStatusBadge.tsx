import type { ContestStatus } from "@online-judge/shared";

const STYLES: Record<ContestStatus, string> = {
  UPCOMING: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  RUNNING: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  ENDED: "bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] text-[var(--ink-muted)]  dark:text-[var(--ink-muted)]",
};

const LABELS: Record<ContestStatus, string> = {
  UPCOMING: "Upcoming",
  RUNNING: "Live",
  ENDED: "Ended",
};

export default function ContestStatusBadge({ status }: { status: ContestStatus }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
