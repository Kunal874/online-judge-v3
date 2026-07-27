import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { deleteContest, fetchAdminContests } from "../../api/contests";
import ContestStatusBadge from "../../components/contests/ContestStatusBadge";

export default function AdminContestsPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["admin-contests"],
    queryFn: () => fetchAdminContests({ pageSize: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-contests"] }),
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Contests</h1>
        <Link
          to="/admin/contests/new"
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-45"
        >
          New Contest
        </Link>
      </div>

      {isPending && <p className="text-[var(--ink-muted)]">Loading...</p>}
      {data && data.items.length === 0 && <p className="text-[var(--ink-muted)]">No contests yet.</p>}

      <div className="flex flex-col gap-2">
        {data?.items.map((contest) => (
          <div
            key={contest.id}
            className="flex items-center justify-between rounded border border-[var(--edge)] px-4 py-3 "
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium">{contest.title}</span>
              <ContestStatusBadge status={contest.status} />
              <span className="text-xs text-[var(--ink-muted)]">
                {contest.problemCount} problems · {contest.registrationCount} registered
              </span>
            </div>
            <div className="flex gap-3 text-sm">
              <Link to={`/admin/contests/${contest.id}/edit`} className="underline">
                Edit
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${contest.title}"? This can't be undone.`)) {
                    deleteMutation.mutate(contest.id);
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
