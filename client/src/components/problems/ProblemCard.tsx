import { Link } from "react-router-dom";
import type { PublicProblemSummary } from "@online-judge/shared";
import DifficultyBadge from "./DifficultyBadge";

export default function ProblemCard({
  problem,
  onTagClick,
}: {
  problem: PublicProblemSummary;
  onTagClick?: (tag: string) => void;
}) {
  return (
    <Link
      to={`/problems/${problem.slug}`}
      className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 px-4 py-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">{problem.title}</span>
        <div className="flex flex-wrap gap-1">
          {problem.tags.map((tag) => (
            <span
              key={tag}
              onClick={(e) => {
                if (!onTagClick) return;
                e.preventDefault();
                e.stopPropagation();
                onTagClick(tag);
              }}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
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
