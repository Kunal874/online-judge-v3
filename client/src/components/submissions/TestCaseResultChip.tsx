import type { TestCaseResultView } from "@online-judge/shared";

const SHORT_LABEL: Record<TestCaseResultView["verdict"], string> = {
  PENDING: "?",
  RUNNING: "…",
  ACCEPTED: "AC",
  WRONG_ANSWER: "WA",
  COMPILE_ERROR: "CE",
  RUNTIME_ERROR: "RE",
  TIME_LIMIT_EXCEEDED: "TLE",
  MEMORY_LIMIT_EXCEEDED: "MLE",
  INTERNAL_ERROR: "ERR",
};

const COLOR: Record<TestCaseResultView["verdict"], string> = {
  PENDING: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  RUNNING: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  ACCEPTED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  WRONG_ANSWER: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  COMPILE_ERROR: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  RUNTIME_ERROR: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  TIME_LIMIT_EXCEEDED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  MEMORY_LIMIT_EXCEEDED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  INTERNAL_ERROR: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export default function TestCaseResultChip({ result }: { result: TestCaseResultView }) {
  return (
    <div
      title={`Test #${result.orderIndex + 1}: ${result.verdict}${result.runtimeMs != null ? ` (${result.runtimeMs}ms)` : ""}`}
      className={`flex h-8 w-8 items-center justify-center rounded text-[10px] font-semibold ${COLOR[result.verdict]}`}
    >
      {SHORT_LABEL[result.verdict]}
    </div>
  );
}
