import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { fetchContests } from "../api/contests";
import ContestStatusBadge from "../components/contests/ContestStatusBadge";

const PAGE_SIZE = 20;

function formatWindow(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const length = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}` : `${minutes}m`;
  return `${start.toLocaleString()} · ${length}`;
}

export default function ContestListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");
  const status = searchParams.get("status") ?? "";

  const { data, isPending, isError } = useQuery({
    queryKey: ["contests", { page, status }],
    queryFn: () => fetchContests({ page, pageSize: PAGE_SIZE, status: status || undefined }),
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
      <h1 className="mb-6 text-2xl font-semibold">Contests</h1>

      <div className="mb-4">
        <select
          value={status}
          onChange={(e) => updateParam("status", e.target.value)}
          className="w-full rounded-full border border-[var(--edge)] bg-[var(--surface)] px-4 py-2 text-smtext-sm "
        >
          <option value="">All contests</option>
          <option value="RUNNING">Live now</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="ENDED">Past</option>
        </select>
      </div>

      {isPending && <p className="text-[var(--ink-muted)]">Loading...</p>}
      {isError && <p className="text-[var(--danger-ink)]">Failed to load contests.</p>}
      {data && data.items.length === 0 && <p className="text-[var(--ink-muted)]">No contests yet.</p>}

      <div className="flex flex-col gap-2">
        {data?.items.map((contest) => (
          <Link
            key={contest.id}
            to={`/contests/${contest.slug}`}
            className="rounded border border-[var(--edge)] p-4 hover:border-[var(--accent)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{contest.title}</span>
              <div className="flex items-center gap-2">
                {contest.isRegistered && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">Registered</span>
                )}
                <ContestStatusBadge status={contest.status} />
              </div>
            </div>
            <div className="mt-1 text-xs text-[var(--ink-muted)]">
              {formatWindow(contest.startsAt, contest.endsAt)}
              {contest.problemCount > 0 && ` · ${contest.problemCount} problems`}
              {` · ${contest.registrationCount} registered`}
            </div>
          </Link>
        ))}
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
