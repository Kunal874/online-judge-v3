import type { ContestStatus } from "@online-judge/shared";

const STYLES: Record<ContestStatus, string> = {
  UPCOMING: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  RUNNING: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  ENDED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
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
