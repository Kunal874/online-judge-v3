import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { LANGUAGES, type Language } from "@online-judge/shared";
import { fetchContestProblem } from "../api/contests";
import DifficultyBadge from "../components/problems/DifficultyBadge";
import ProblemStatement from "../components/problems/ProblemStatement";
import Playground from "../components/editor/Playground";
import LanguagePicker from "../components/editor/LanguagePicker";
import { formatDuration, useCountdown } from "../hooks/useCountdown";

export default function ContestProblemPage() {
  const { slug, label } = useParams<{ slug: string; label: string }>();
  const [language, setLanguage] = useState<Language>("CPP");

  const { data, isPending, error } = useQuery({
    queryKey: ["contest-problem", slug, label],
    queryFn: () => fetchContestProblem(slug!, label!),
    enabled: Boolean(slug && label),
    retry: false,
  });

  const remainingMs = useCountdown(
    data?.contest.status === "RUNNING" ? data.contest.endsAt : null,
  );

  if (isPending) return <p className="p-8 text-[var(--ink-muted)]">Loading...</p>;

  if (error) {
    // 403 here means "registered users only", which is actionable — a
    // generic "not found" would leave the reader stuck.
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-[var(--danger-ink)]">
          {status === 403
            ? "You need to register for this contest to view its problems."
            : "This problem is not available."}
        </p>
        <Link to={`/contests/${slug}`} className="mt-2 inline-block text-sm underline">
          Back to contest
        </Link>
      </main>
    );
  }

  const { contest, problem, points } = data;

  return (
    // Same full-height split as the practice workspace, so the verdict stays
    // on screen here too — it matters more under a contest clock, not less.
    <main className="flex flex-col lg:h-full lg:overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-3 text-[13px]">
        <Link to={`/contests/${contest.slug}`} className="underline underline-offset-4">
          {contest.title}
        </Link>
        <Link
          to={`/contests/${contest.slug}/leaderboard`}
          className="text-[var(--ink-muted)] underline underline-offset-4"
        >
          Leaderboard
        </Link>
        {remainingMs !== null && (
          <span className="ml-auto tabular-nums">Ends in {formatDuration(remainingMs)}</span>
        )}
        {contest.status === "ENDED" && (
          <span className="ml-auto text-[var(--ink-muted)]">
            Contest ended — submissions no longer count
          </span>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <section className="surface hairline flex min-h-0 flex-col overflow-y-auto p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-[var(--accent)] font-heading text-[15px] text-[var(--accent-contrast)]">
              {data.label}
            </span>
            <h1 className="text-3xl">{problem.title}</h1>
            <DifficultyBadge difficulty={problem.difficulty} />
            <span className="text-[12px] text-[var(--ink-muted)]">{points} pts</span>
          </div>

          <ProblemStatement problem={problem} />
        </section>

        <section className="flex min-h-0 flex-col gap-3">
          <LanguagePicker value={language} onChange={setLanguage} languages={LANGUAGES} />
          <div className="min-h-[38rem] flex-1 lg:min-h-0">
            <Playground
              key={language}
              language={language}
              problem={problem}
              // Only tag the submission while the contest is live; afterwards
              // this page stays readable as practice, and the server would
              // reject a contest-tagged submission anyway.
              contestId={contest.status === "RUNNING" ? contest.id : undefined}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
