import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { LANGUAGES, type Language } from "@online-judge/shared";
import { fetchContestProblem } from "../api/contests";
import DifficultyBadge from "../components/problems/DifficultyBadge";
import ProblemStatement from "../components/problems/ProblemStatement";
import Playground from "../components/editor/Playground";
import { LANGUAGE_LABELS } from "../lib/languageStubs";
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

  if (isPending) return <p className="p-8 text-slate-500">Loading...</p>;

  if (error) {
    // 403 here means "registered users only", which is actionable — a
    // generic "not found" would leave the reader stuck.
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-red-600 dark:text-red-400">
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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link to={`/contests/${contest.slug}`} className="underline">
            {contest.title}
          </Link>
          <Link to={`/contests/${contest.slug}/leaderboard`} className="text-slate-500 underline">
            Leaderboard
          </Link>
        </div>
        {remainingMs !== null && (
          <span className="text-sm font-medium">Ends in {formatDuration(remainingMs)}</span>
        )}
        {contest.status === "ENDED" && (
          <span className="text-sm text-slate-500">
            Contest ended — submissions no longer count
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="font-mono text-lg text-slate-500">{data.label}</span>
            <h1 className="text-2xl font-semibold">{problem.title}</h1>
            <DifficultyBadge difficulty={problem.difficulty} />
            <span className="text-xs text-slate-500">{points} pts</span>
          </div>

          <ProblemStatement problem={problem} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-600"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </option>
              ))}
            </select>
          </div>

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
      </div>
    </main>
  );
}
