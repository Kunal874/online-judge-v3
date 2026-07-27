import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PublicProblemDetail } from "@online-judge/shared";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-[10px] tracking-[0.1em] text-[var(--ink-muted)] uppercase">
      {children}
    </h2>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-auto rounded-2xl bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] p-3 font-mono text-[12px] whitespace-pre-wrap">
      {children}
    </pre>
  );
}

// The statement half of a problem page — shared by the public problem page
// and the contest problem page, which differ only in their headers.
export default function ProblemStatement({ problem }: { problem: PublicProblemDetail }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Stating the limits as a budget rather than trivia: the numbers are
          the strongest hint a problem gives about the intended complexity,
          and burying them at the bottom wastes that. */}
      <div className="surface-raised flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 text-[12px]">
        <span className="text-[10px] tracking-[0.1em] text-[var(--ink-muted)] uppercase">
          Budget
        </span>
        <span className="tabular-nums">{problem.timeLimitMs} ms</span>
        <span className="tabular-nums">{Math.round(problem.memoryLimitKb / 1024)} MB</span>
        <span className="text-[var(--ink-muted)]">sandboxed · no network</span>
      </div>

      <article
        className="prose prose-sm max-w-none
          prose-headings:font-heading prose-headings:font-normal
          prose-p:text-[var(--ink)] prose-li:text-[var(--ink)] prose-strong:text-[var(--ink)]
          prose-code:rounded prose-code:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]
          prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:text-[var(--ink)]
          prose-code:before:content-none prose-code:after:content-none
          prose-a:text-[var(--accent)]"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.statement}</ReactMarkdown>
      </article>

      {problem.constraints && (
        <div>
          <SectionLabel>Constraints</SectionLabel>
          <p className="font-mono text-[13px] text-[var(--ink-muted)]">{problem.constraints}</p>
        </div>
      )}

      {problem.sampleTestCases.length > 0 && (
        <div>
          <SectionLabel>
            Samples · {problem.sampleTestCases.length} shown, the rest hidden
          </SectionLabel>
          <div className="flex flex-col gap-3">
            {problem.sampleTestCases.map((testCase, i) => (
              <div key={testCase.id} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-[10px] tracking-[0.08em] text-[var(--ink-muted)] uppercase">
                    Input {i + 1}
                  </div>
                  <Code>{testCase.input}</Code>
                </div>
                <div>
                  <div className="mb-1 text-[10px] tracking-[0.08em] text-[var(--ink-muted)] uppercase">
                    Expected {i + 1}
                  </div>
                  <Code>{testCase.expectedOutput}</Code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
