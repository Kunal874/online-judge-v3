import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { LANGUAGES, type Language } from "@online-judge/shared";
import { fetchProblemBySlug } from "../api/problems";
import DifficultyBadge from "../components/problems/DifficultyBadge";
import ProblemStatement from "../components/problems/ProblemStatement";
import Playground from "../components/editor/Playground";
import { LANGUAGE_LABELS } from "../lib/languageStubs";

export default function ProblemDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [language, setLanguage] = useState<Language>("CPP");

  const {
    data: problem,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["problem", slug],
    queryFn: () => fetchProblemBySlug(slug!),
    enabled: !!slug,
  });

  if (isPending) return <p className="p-8 text-slate-500">Loading...</p>;
  if (isError || !problem)
    return <p className="p-8 text-red-600 dark:text-red-400">Problem not found.</p>;

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-2">
      <div>
        <div className="mb-4 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{problem.title}</h1>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>

        <div className="mb-4 flex gap-1">
          {problem.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800"
            >
              {tag}
            </span>
          ))}
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

        <Playground key={language} language={language} problem={problem} />
      </div>
    </main>
  );
}
