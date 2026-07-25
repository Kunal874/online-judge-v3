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
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
        >
          New Contest
        </Link>
      </div>

      {isPending && <p className="text-slate-500">Loading...</p>}
      {data && data.items.length === 0 && <p className="text-slate-500">No contests yet.</p>}

      <div className="flex flex-col gap-2">
        {data?.items.map((contest) => (
          <div
            key={contest.id}
            className="flex items-center justify-between rounded border border-slate-200 px-4 py-3 dark:border-slate-700"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium">{contest.title}</span>
              <ContestStatusBadge status={contest.status} />
              <span className="text-xs text-slate-500">
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
                className="text-red-600 dark:text-red-400"
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
