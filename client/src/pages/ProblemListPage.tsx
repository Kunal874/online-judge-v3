import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { fetchProblems } from "../api/problems";
import ProblemCard from "../components/problems/ProblemCard";

const PAGE_SIZE = 20;

export default function ProblemListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");
  const difficulty = searchParams.get("difficulty") ?? "";
  const search = searchParams.get("search") ?? "";

  const { data, isPending, isError } = useQuery({
    queryKey: ["problems", { page, difficulty, search }],
    queryFn: () =>
      fetchProblems({
        page,
        pageSize: PAGE_SIZE,
        difficulty: difficulty || undefined,
        search: search || undefined,
      }),
  });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Problems</h1>

      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Search by title..."
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("search", e.currentTarget.value);
          }}
          className="flex-1 rounded border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600"
        />
        <select
          value={difficulty}
          onChange={(e) => updateParam("difficulty", e.target.value)}
          className="rounded border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600"
        >
          <option value="">All difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      {isPending && <p className="text-slate-500">Loading...</p>}
      {isError && <p className="text-red-600 dark:text-red-400">Failed to load problems.</p>}
      {data && data.items.length === 0 && (
        <p className="text-slate-500">No problems match your filters.</p>
      )}

      <div className="flex flex-col gap-2">
        {data?.items.map((problem) => <ProblemCard key={problem.id} problem={problem} />)}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => updateParam("page", String(page - 1))}
            className="disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => updateParam("page", String(page + 1))}
            className="disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
