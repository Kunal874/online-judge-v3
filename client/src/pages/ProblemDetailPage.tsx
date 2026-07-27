import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { LANGUAGES, type Language } from "@online-judge/shared";
import { fetchProblemBySlug } from "../api/problems";
import DifficultyBadge from "../components/problems/DifficultyBadge";
import ProblemStatement from "../components/problems/ProblemStatement";
import Playground from "../components/editor/Playground";
import LanguagePicker from "../components/editor/LanguagePicker";
import Tag from "../components/ui/Tag";

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

  if (isPending) return <p className="p-8 text-[var(--ink-muted)]">Loading…</p>;
  if (isError || !problem)
    return (
      <div className="flex flex-col items-start gap-2 p-8">
        <p className="text-[var(--danger-ink)]">Problem not found.</p>
        <Link to="/problems" className="text-[var(--accent)] underline underline-offset-4">
          Back to problems
        </Link>
      </div>
    );

  return (
    // Fills the shell, with each pane scrolling independently. One
    // page-length scroll is what pushed the verdict below the fold — the
    // results have to hold still while the statement moves.
    <main className="grid grid-cols-1 gap-4 p-4 lg:h-full lg:grid-cols-2 lg:overflow-hidden">
      <section className="surface hairline flex min-h-0 flex-col overflow-y-auto p-6">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">{problem.title}</h1>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>

        <div className="mb-6 flex flex-wrap gap-1.5">
          {problem.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>

        <ProblemStatement problem={problem} />
      </section>

      <section className="flex min-h-0 flex-col gap-3">
        <LanguagePicker value={language} onChange={setLanguage} languages={LANGUAGES} />
        {/* Keyed by language so switching remounts with that language's own
            saved draft, rather than syncing buffers inside an effect. */}
        <div className="min-h-[38rem] flex-1 lg:min-h-0">
          <Playground key={language} language={language} problem={problem} />
        </div>
      </section>
    </main>
  );
}
