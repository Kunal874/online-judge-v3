import { Link } from "react-router-dom";
import type { PublicProblemSummary } from "@online-judge/shared";
import DifficultyBadge from "./DifficultyBadge";

export default function ProblemCard({ problem }: { problem: PublicProblemSummary }) {
  return (
    <Link
      to={`/problems/${problem.slug}`}
      className="flex items-center justify-between rounded border border-slate-200 px-4 py-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      <div className="flex items-center gap-3">
        <span className="font-medium">{problem.title}</span>
        <div className="flex gap-1">
          {problem.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <DifficultyBadge difficulty={problem.difficulty} />
    </Link>
  );
}
