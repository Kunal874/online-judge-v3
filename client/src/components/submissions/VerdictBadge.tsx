import type { Verdict } from "@online-judge/shared";

const LABELS: Record<Verdict, string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  ACCEPTED: "Accepted",
  WRONG_ANSWER: "Wrong Answer",
  COMPILE_ERROR: "Compile Error",
  RUNTIME_ERROR: "Runtime Error",
  TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
  MEMORY_LIMIT_EXCEEDED: "Memory Limit Exceeded",
  INTERNAL_ERROR: "Internal Error",
};

const STYLES: Record<Verdict, string> = {
  PENDING: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-700",
  RUNNING: "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40",
  ACCEPTED: "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40",
  WRONG_ANSWER: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40",
  COMPILE_ERROR: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40",
  RUNTIME_ERROR: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40",
  TIME_LIMIT_EXCEEDED: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40",
  MEMORY_LIMIT_EXCEEDED: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40",
  INTERNAL_ERROR: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-700",
};

export default function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STYLES[verdict]}`}>
      {LABELS[verdict]}
    </span>
  );
}
