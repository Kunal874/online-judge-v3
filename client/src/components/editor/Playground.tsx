import { useState } from "react";
import type { Language, PublicProblemDetail } from "@online-judge/shared";
import CodeEditor from "./CodeEditor";
import { RunPanel, SubmissionResult } from "./ResultPanel";
import ProblemSubmissions from "./ProblemSubmissions";
import { apiErrorMessage } from "../../lib/apiError";
import { useRunJob } from "../../hooks/useRunJob";
import { useSubmission } from "../../hooks/useSubmission";
import { useDraftCode } from "../../hooks/useDraftCode";
import { useAuth } from "../../context/AuthContext";
import LoginRequiredDialog from "../auth/LoginRequiredDialog";
import Button from "../ui/Button";
import Tabs, { type TabDef } from "../ui/Tabs";

type PanelTab = "result" | "run" | "attempts";

interface PlaygroundProps {
  language: Language;
  problem: PublicProblemDetail;
  /** Present on a contest problem page, so the submission counts toward it. */
  contestId?: string;
}

export default function Playground({ language, problem, contestId }: PlaygroundProps) {
  const { code, setCode, reset, isDirty } = useDraftCode(problem.id, language);
  const [stdin, setStdin] = useState("");
  const [tab, setTab] = useState<PanelTab>("result");
  // Non-null while the sign-in prompt is open; the string is the verb shown
  // in its title, so the prompt names whichever button was pressed.
  const [loginPromptFor, setLoginPromptFor] = useState<string | null>(null);

  const { user, isLoading: isLoadingUser } = useAuth();
  const {
    submit: submitRun,
    isSubmitting: isSubmittingRun,
    submitError: runError,
    jobStatus,
    isRunning,
  } = useRunJob();
  const {
    submit: submitCode,
    isSubmitting: isSubmittingCode,
    submitError: submitCodeError,
    submission,
    isJudging,
  } = useSubmission(problem.id);

  // The tab follows whichever button was pressed, set in the handlers below
  // rather than watched in an effect — the click is the moment the intent is
  // known, and reacting to the resulting state change instead just adds a
  // render for the same outcome.
  function handleRun() {
    if (!user) return setLoginPromptFor("run code");
    setTab("run");
    submitRun({
      language,
      code,
      stdin,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
    });
  }

  function handleSubmit() {
    if (!user) return setLoginPromptFor("submit a solution");
    setTab("result");
    submitCode({ language, code, contestId });
  }

  const runResult = jobStatus?.status === "completed" ? jobStatus.result : undefined;
  // Disabled while auth resolves, so a click in that window can't slip past
  // the signed-out check above and fail as a bare 401.
  const busy = isLoadingUser || isSubmittingRun || isRunning || isSubmittingCode || isJudging;
  // A session can expire between page load and clicking, so the client-side
  // check is a courtesy — the server's rejection still has to be visible.
  const requestError = submitCodeError ?? runError;

  const tabs: TabDef<PanelTab>[] = [
    {
      id: "result",
      label: "Result",
      badge: isJudging ? (
        <span className="inline-block size-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
      ) : undefined,
    },
    { id: "run", label: "Run" },
    { id: "attempts", label: "Attempts" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* min-h keeps the editor usable on short viewports; without it the
          fixed-height panel below can squeeze it down to a couple of lines. */}
      <div className="surface hairline flex min-h-[15rem] flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--edge)] px-4 py-2">
          <span className="font-heading text-[13px]">solution</span>
          <span className="text-[11px] text-[var(--ink-muted)]">
            sandboxed · no network · {problem.timeLimitMs} ms
          </span>
          {isDirty && (
            <button
              onClick={reset}
              className="ml-auto text-[11px] text-[var(--ink-muted)] underline underline-offset-4 hover:text-[var(--ink)]"
            >
              Reset to starter
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor language={language} value={code} onChange={setCode} />
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button onClick={handleRun} disabled={busy} variant="secondary">
          {isRunning ? "Running…" : "Run"}
        </Button>
        <Button onClick={handleSubmit} disabled={busy}>
          {isJudging ? "Judging…" : "Submit"}
        </Button>
        {!user && !isLoadingUser && (
          <span className="text-[12px] text-[var(--ink-muted)]">Log in to run or submit</span>
        )}
        {isDirty && <span className="ml-auto text-[11px] text-[var(--ink-muted)]">Draft saved</span>}
      </div>

      {requestError && (
        <p className="shrink-0 rounded-2xl bg-[var(--danger-tint)] px-3 py-2 text-[13px] text-[var(--danger-ink)]">
          {apiErrorMessage(requestError, "That didn't go through. Please try again.")}
        </p>
      )}

      {/* Fixed height rather than growing with content: results have to be on
          screen the moment they arrive, and a panel that expands pushes the
          verdict below the fold exactly when it matters most. */}
      <div className="surface hairline flex h-[15rem] shrink-0 flex-col overflow-hidden">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
        <div className="min-h-0 flex-1">
          {tab === "result" && <SubmissionResult submission={submission} />}
          {tab === "run" && (
            <RunPanel
              stdin={stdin}
              onStdinChange={setStdin}
              result={runResult}
              isRunning={isRunning || isSubmittingRun}
              failed={
                jobStatus?.status === "failed" ? (jobStatus.error ?? "Execution failed.") : undefined
              }
            />
          )}
          {tab === "attempts" &&
            (user ? (
              <ProblemSubmissions problemId={problem.id} refreshKey={submission?.verdict} />
            ) : (
              <p className="p-4 text-[13px] text-[var(--ink-muted)]">
                Log in to see your attempts at this problem.
              </p>
            ))}
        </div>
      </div>

      {loginPromptFor && (
        <LoginRequiredDialog action={loginPromptFor} onClose={() => setLoginPromptFor(null)} />
      )}
    </div>
  );
}
