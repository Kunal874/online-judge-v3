import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchSubmissions } from "../../api/submissions";
import { LANGUAGE_LABELS } from "../../lib/languageStubs";
import VerdictBadge from "../submissions/VerdictBadge";

/** Short relative time — "4m", "2h", "3d". Absolute dates read as noise in a list this dense. */
function ago(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * This user's attempts at the problem currently open. Lives in the
 * workspace rather than behind a link so "what did I already try" doesn't
 * cost you the page you're working on.
 *
 * `refreshKey` changes when a new submission finishes judging, which is
 * what pulls the newest attempt into the list without a manual reload.
 */
export default function ProblemSubmissions({
  problemId,
  refreshKey,
}: {
  problemId: string;
  refreshKey?: string;
}) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["submissions", { problemId }, refreshKey],
    queryFn: () => fetchSubmissions({ problemId, pageSize: 25 }),
  });

  if (isPending) return <p className="p-4 text-[13px] text-[var(--ink-muted)]">Loading…</p>;
  if (isError)
    return <p className="p-4 text-[13px] text-[var(--danger-ink)]">Couldn&apos;t load attempts.</p>;

  if (data.items.length === 0) {
    return (
      <p className="p-4 text-[13px] text-[var(--ink-muted)]">
        No attempts yet. Your submissions for this problem collect here.
      </p>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-[var(--surface)]">
          <tr className="text-[10px] tracking-[0.08em] text-[var(--ink-muted)] uppercase">
            <th className="px-4 py-2 text-left font-normal">Verdict</th>
            <th className="px-2 py-2 text-left font-normal">Lang</th>
            <th className="px-2 py-2 text-right font-normal">Passed</th>
            <th className="px-4 py-2 text-right font-normal">When</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((submission) => (
            <tr
              key={submission.id}
              className="border-t border-[var(--edge)] hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]"
            >
              <td className="px-4 py-2">
                <Link to={`/submissions/${submission.id}`}>
                  <VerdictBadge verdict={submission.verdict} size="sm" />
                </Link>
              </td>
              <td className="px-2 py-2 text-[var(--ink-muted)]">
                {LANGUAGE_LABELS[submission.language]}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {submission.passedCount}/{submission.totalCount}
              </td>
              <td className="px-4 py-2 text-right whitespace-nowrap text-[var(--ink-muted)]">
                {ago(submission.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
