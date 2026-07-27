import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { deleteProblem, fetchAdminProblems } from "../../api/problems";
import DifficultyBadge from "../../components/problems/DifficultyBadge";

export default function AdminProblemsPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["admin-problems"],
    queryFn: () => fetchAdminProblems({ pageSize: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProblem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-problems"] }),
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Problems</h1>
        <Link
          to="/admin/problems/new"
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-45"
        >
          New Problem
        </Link>
      </div>

      {isPending && <p className="text-[var(--ink-muted)]">Loading...</p>}

      <div className="flex flex-col gap-2">
        {data?.items.map((problem) => (
          <div
            key={problem.id}
            className="flex items-center justify-between rounded border border-[var(--edge)] px-4 py-3 "
          >
            <div className="flex items-center gap-3">
              <span className="font-medium">{problem.title}</span>
              <DifficultyBadge difficulty={problem.difficulty} />
              {!problem.isPublished && (
                <span className="rounded bg-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-2 py-0.5 text-xs text-[var(--ink-muted)]  ">
                  Draft
                </span>
              )}
            </div>
            <div className="flex gap-3 text-sm">
              <Link to={`/admin/problems/${problem.id}/edit`} className="underline">
                Edit
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${problem.title}"? This can't be undone.`)) {
                    deleteMutation.mutate(problem.id);
                  }
                }}
                className="text-[var(--danger-ink)]"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
