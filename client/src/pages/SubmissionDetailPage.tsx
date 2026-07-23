import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchSubmission } from "../api/submissions";
import CodeEditor from "../components/editor/CodeEditor";
import VerdictBadge from "../components/submissions/VerdictBadge";
import TestCaseResultChip from "../components/submissions/TestCaseResultChip";
import { LANGUAGE_LABELS } from "../lib/languageStubs";

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: submission, isPending, isError } = useQuery({
    queryKey: ["submission", id],
    queryFn: () => fetchSubmission(id!),
    enabled: !!id,
  });

  if (isPending) return <p className="p-8 text-slate-500">Loading...</p>;
  if (isError || !submission) {
    return <p className="p-8 text-red-600 dark:text-red-400">Submission not found.</p>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{submission.problemTitle}</h1>
        <VerdictBadge verdict={submission.verdict} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
        <Link to={`/problems/${submission.problemSlug}`} className="underline">
          View problem
        </Link>
        <span>{LANGUAGE_LABELS[submission.language]}</span>
        <span>{new Date(submission.createdAt).toLocaleString()}</span>
        <span>
          {submission.passedCount}/{submission.totalCount} passed
        </span>
        {submission.runtimeMs != null && <span>{submission.runtimeMs}ms</span>}
      </div>

      {submission.results.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {submission.results.map((r) => (
            <TestCaseResultChip key={r.orderIndex} result={r} />
          ))}
        </div>
      )}

      {submission.errorMessage && (
        <pre className="mb-4 overflow-auto rounded bg-slate-100 p-3 text-xs whitespace-pre-wrap dark:bg-slate-800">
          {submission.errorMessage}
        </pre>
      )}

      <CodeEditor language={submission.language} value={submission.code} readOnly />
    </main>
  );
}
