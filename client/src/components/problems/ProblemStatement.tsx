import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PublicProblemDetail } from "@online-judge/shared";

// The statement half of a problem page — shared by the public problem page
// and the contest problem page, which differ only in their headers.
export default function ProblemStatement({ problem }: { problem: PublicProblemDetail }) {
  return (
    <>
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
        Time limit: {problem.timeLimitMs}ms · Memory limit:{" "}
        {Math.round(problem.memoryLimitKb / 1024)}MB
      </p>

      {problem.sampleTestCases.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-500">Sample Test Cases</h2>
          {problem.sampleTestCases.map((tc, i) => (
            <div key={tc.id} className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="mb-1 text-slate-400">Input {i + 1}</div>
                <pre className="overflow-auto rounded bg-slate-100 p-2 dark:bg-slate-800">
                  {tc.input}
                </pre>
              </div>
              <div>
                <div className="mb-1 text-slate-400">Expected Output {i + 1}</div>
                <pre className="overflow-auto rounded bg-slate-100 p-2 dark:bg-slate-800">
                  {tc.expectedOutput}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
