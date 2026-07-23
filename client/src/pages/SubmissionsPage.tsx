import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { fetchSubmissions } from "../api/submissions";
import VerdictBadge from "../components/submissions/VerdictBadge";
import { LANGUAGE_LABELS } from "../lib/languageStubs";

const PAGE_SIZE = 20;

export default function SubmissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");

  const { data, isPending } = useQuery({
    queryKey: ["submissions", page],
    queryFn: () => fetchSubmissions({ page, pageSize: PAGE_SIZE }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">My Submissions</h1>

      {isPending && <p className="text-slate-500">Loading...</p>}
      {data && data.items.length === 0 && (
        <p className="text-slate-500">No submissions yet — solve a problem to see history here.</p>
      )}

      <div className="flex flex-col gap-2">
        {data?.items.map((s) => (
          <Link
            key={s.id}
            to={`/submissions/${s.id}`}
            className="flex items-center justify-between rounded border border-slate-200 px-4 py-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium">{s.problemTitle}</span>
              <span className="text-xs text-slate-500">{LANGUAGE_LABELS[s.language]}</span>
              <span className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {s.passedCount}/{s.totalCount}
              </span>
              <VerdictBadge verdict={s.verdict} />
            </div>
          </Link>
        ))}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setSearchParams({ page: String(page - 1) })}
            className="disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setSearchParams({ page: String(page + 1) })}
            className="disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
