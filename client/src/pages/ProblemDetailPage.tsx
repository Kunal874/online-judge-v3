import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LANGUAGES, type Language, type PublicProblemDetail } from "@online-judge/shared";
import { fetchProblemBySlug } from "../api/problems";
import DifficultyBadge from "../components/problems/DifficultyBadge";
import CodeEditor from "../components/editor/CodeEditor";
import { LANGUAGE_LABELS, LANGUAGE_STUBS } from "../lib/languageStubs";
import { useRunJob } from "../hooks/useRunJob";

export default function ProblemDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [language, setLanguage] = useState<Language>("CPP");

  const { data: problem, isPending, isError } = useQuery({
    queryKey: ["problem", slug],
    queryFn: () => fetchProblemBySlug(slug!),
    enabled: !!slug,
  });

  if (isPending) return <p className="p-8 text-slate-500">Loading...</p>;
  if (isError || !problem) return <p className="p-8 text-red-600 dark:text-red-400">Problem not found.</p>;

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-2">
      <div>
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
          Time limit: {problem.timeLimitMs}ms · Memory limit: {Math.round(problem.memoryLimitKb / 1024)}
          MB
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
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-600"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABELS[lang]}
              </option>
            ))}
          </select>
        </div>

        <Playground key={language} language={language} problem={problem} />
      </div>
    </main>
  );
}

const PANEL_CLASS =
  "min-h-24 w-full rounded border border-slate-300 bg-transparent p-2 text-xs font-mono dark:border-slate-600";

// Keyed by language in the parent so switching languages remounts this
// with a fresh stub instead of syncing state in an effect.
function Playground({ language, problem }: { language: Language; problem: PublicProblemDetail }) {
  const [code, setCode] = useState(LANGUAGE_STUBS[language]);
  const [stdin, setStdin] = useState("");
  const { submit, isSubmitting, jobStatus, isRunning } = useRunJob();

  const implemented = language === "PYTHON";

  function handleRun() {
    submit({
      language,
      code,
      stdin,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
    });
  }

  const result = jobStatus?.status === "completed" ? jobStatus.result : undefined;

  return (
    <div>
      <CodeEditor language={language} value={code} onChange={setCode} />

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs text-slate-500">Custom Input</div>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="stdin for your program"
            className={PANEL_CLASS}
          />
        </div>
        <div>
          <div className="mb-1 text-xs text-slate-500">Output</div>
          <pre className={`${PANEL_CLASS} overflow-auto whitespace-pre-wrap`}>
            {isRunning
              ? "Running..."
              : jobStatus?.status === "failed"
                ? (jobStatus.error ?? "Execution failed.")
                : result
                  ? formatResult(result)
                  : ""}
          </pre>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleRun}
          disabled={!implemented || isSubmitting || isRunning}
          title={implemented ? undefined : "Only Python is supported so far"}
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {isRunning ? "Running..." : "Run"}
        </button>
        <button
          disabled
          title="Coming in a later milestone"
          className="rounded bg-slate-200 px-4 py-2 text-sm text-slate-500 dark:bg-slate-700"
        >
          Submit
        </button>
        {!implemented && (
          <span className="self-center text-xs text-slate-400">
            Only Python runs so far — the other languages land in a later milestone.
          </span>
        )}
      </div>
    </div>
  );
}

function formatResult(result: {
  stdout: string;
  stderr: string;
  timedOut: boolean;
  oomKilled: boolean;
  exitCode: number | null;
}): string {
  if (result.timedOut) return "Time Limit Exceeded";
  if (result.oomKilled) return "Memory Limit Exceeded";
  const parts: string[] = [];
  if (result.stdout) parts.push(result.stdout);
  if (result.stderr) parts.push(`--- stderr ---\n${result.stderr}`);
  if (result.exitCode !== 0) parts.push(`(exited with code ${result.exitCode})`);
  return parts.join("\n") || "(no output)";
}
