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
      className="surface hairline group flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-[var(--surface-raised)]"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <span className="font-heading text-[17px] group-hover:text-[var(--accent)]">
          {problem.title}
        </span>
        <div className="flex flex-wrap gap-1">
          {problem.tags.map((tag) => (
            <span
              key={tag}
              // Nested inside a Link, so the click has to be stopped before
              // the router follows it — filtering by a tag should stay on
              // the list rather than open the problem.
              onClick={(e) => {
                if (!onTagClick) return;
                e.preventDefault();
                e.stopPropagation();
                onTagClick(tag);
              }}
              className="rounded-full bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] px-2.5 py-0.5 text-[11px] text-[var(--ink-muted)] hover:bg-[var(--accent-tint)] hover:text-[var(--accent-ink)]"
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
