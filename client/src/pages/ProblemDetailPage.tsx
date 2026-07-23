import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchProblemBySlug } from "../api/problems";
import DifficultyBadge from "../components/problems/DifficultyBadge";

export default function ProblemDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: problem, isPending, isError } = useQuery({
    queryKey: ["problem", slug],
    queryFn: () => fetchProblemBySlug(slug!),
    enabled: !!slug,
  });

  if (isPending) return <p className="p-8 text-slate-500">Loading...</p>;
  if (isError || !problem) return <p className="p-8 text-red-600 dark:text-red-400">Problem not found.</p>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
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

      <article className="prose prose-slate dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.statement}</ReactMarkdown>
      </article>

      {problem.constraints && (
        <div className="mt-6">
          <h2 className="mb-1 text-sm font-semibold text-slate-500">Constraints</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{problem.constraints}</p>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Time limit: {problem.timeLimitMs}ms · Memory limit: {Math.round(problem.memoryLimitKb / 1024)}MB
      </p>

      <div className="mt-8 rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-600">
        Code editor and Run/Submit are coming in the next milestone.
      </div>
    </main>
  );
}
