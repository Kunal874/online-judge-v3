import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { fetchProblems } from "../api/problems";
import ProblemCard from "../components/problems/ProblemCard";
import { Select, TextInput } from "../components/ui/Input";
import Button from "../components/ui/Button";

const PAGE_SIZE = 20;

export default function ProblemListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");
  const difficulty = searchParams.get("difficulty") ?? "";
  const search = searchParams.get("search") ?? "";
  const tag = searchParams.get("tag") ?? "";

  const { data, isPending, isError } = useQuery({
    queryKey: ["problems", { page, difficulty, search, tag }],
    queryFn: () =>
      fetchProblems({
        page,
        pageSize: PAGE_SIZE,
        difficulty: difficulty || undefined,
        search: search || undefined,
        tag: tag || undefined,
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
    <main className="mx-auto max-w-4xl px-5 py-12">
      <header className="mb-8">
        <h1 className="text-4xl">Problems</h1>
        <p className="mt-1 text-[14px] text-[var(--ink-muted)]">
          Every problem hides most of its tests. Passing the samples is the start, not the finish.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        <TextInput
          type="text"
          placeholder="Search titles…"
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("search", e.currentTarget.value);
          }}
          className="min-w-0 flex-1"
        />
        <Select value={difficulty} onChange={(e) => updateParam("difficulty", e.target.value)}>
          <option value="">All difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </Select>
        <TextInput
          type="text"
          placeholder="Tag…"
          defaultValue={tag}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("tag", e.currentTarget.value);
          }}
          className="w-36"
        />
      </div>

      {tag && (
        <div className="mb-4 flex items-center gap-2 text-[12px] text-[var(--ink-muted)]">
          Filtering by tag
          <button
            onClick={() => updateParam("tag", "")}
            className="rounded-full bg-[var(--accent-tint)] px-2.5 py-0.5 text-[var(--accent-ink)] hover:line-through"
          >
            {tag} ×
          </button>
        </div>
      )}

      {isPending && <p className="text-[var(--ink-muted)]">Loading…</p>}
      {isError && <p className="text-[var(--danger-ink)]">Failed to load problems.</p>}
      {data && data.items.length === 0 && (
        <p className="text-[var(--ink-muted)]">No problems match those filters.</p>
      )}

      <div className="flex flex-col gap-2">
        {data?.items.map((problem) => (
          <ProblemCard
            key={problem.id}
            problem={problem}
            onTagClick={(t) => updateParam("tag", t)}
          />
        ))}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="mt-8 flex items-center justify-center gap-4 text-[13px]">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateParam("page", String(page - 1))}
          >
            Previous
          </Button>
          <span className="text-[var(--ink-muted)] tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => updateParam("page", String(page + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </main>
  );
}
