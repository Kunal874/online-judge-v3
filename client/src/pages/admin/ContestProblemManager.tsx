import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { addContestProblem, fetchAdminContest, removeContestProblem } from "../../api/contests";
import { fetchAdminProblems } from "../../api/problems";

const inputClass =
  "w-full w-full rounded-full border border-[var(--edge)] bg-[var(--surface)] px-4 py-2 text-smtext-sm ";

// Nested under the contest edit form, mirroring how TestCaseManager sits
// under the problem edit form.
export default function ContestProblemManager({ contestId }: { contestId: string }) {
  const queryClient = useQueryClient();
  const [problemId, setProblemId] = useState("");
  const [label, setLabel] = useState("");
  const [points, setPoints] = useState(100);
  const [error, setError] = useState<string | null>(null);

  const { data: contest } = useQuery({
    queryKey: ["admin-contest", contestId],
    queryFn: () => fetchAdminContest(contestId),
  });

  // The full problem pool to choose from — including unpublished ones,
  // which is the normal state for a problem written for a contest.
  const { data: problems } = useQuery({
    queryKey: ["admin-problems"],
    queryFn: () => fetchAdminProblems({ pageSize: 50 }),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-contest", contestId] });
    queryClient.invalidateQueries({ queryKey: ["admin-contests"] });
  }

  const addMutation = useMutation({
    mutationFn: () =>
      addContestProblem(contestId, {
        problemId,
        label,
        points,
        orderIndex: contest?.problems.length ?? 0,
      }),
    onSuccess: () => {
      setProblemId("");
      setLabel("");
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeContestProblem(contestId, id),
    onSuccess: invalidate,
  });

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addMutation.mutateAsync();
    } catch (err) {
      setError(isAxiosError(err) ? (err.response?.data?.error ?? "Failed to add") : "Failed to add");
    }
  }

  const alreadyAdded = new Set(contest?.problems.map((p) => p.problem.id) ?? []);
  const available = problems?.items.filter((p) => !alreadyAdded.has(p.id)) ?? [];

  return (
    <section className="mt-10 border-t border-[var(--edge)] pt-6 ">
      <h2 className="mb-4 text-lg font-semibold">Contest Problems</h2>

      {contest && contest.problems.length > 0 && (
        <div className="mb-6 flex flex-col gap-2">
          {contest.problems.map((cp) => (
            <div
              key={cp.id}
              className="flex items-center justify-between rounded border border-[var(--edge)] px-3 py-2 text-sm "
            >
              <div className="flex items-center gap-3">
                <span className="w-6 font-mono text-[var(--ink-muted)]">{cp.label}</span>
                <span>{cp.problem.title}</span>
                <span className="text-xs text-[var(--ink-muted)]">{cp.points} pts</span>
              </div>
              <button
                onClick={() => removeMutation.mutate(cp.problem.id)}
                className="text-[var(--danger-ink)]"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
          Problem
          <select
            className={inputClass}
            value={problemId}
            onChange={(e) => setProblemId(e.target.value)}
            required
          >
            <option value="">Select a problem...</option>
            {available.map((problem) => (
              <option key={problem.id} value={problem.id}>
                {problem.title}
                {problem.isPublished ? "" : " (draft)"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-20 flex-col gap-1 text-sm">
          Label
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value.toUpperCase())}
            placeholder="A"
            maxLength={4}
            required
          />
        </label>
        <label className="flex w-24 flex-col gap-1 text-sm">
          Points
          <input
            type="number"
            className={inputClass}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            min={1}
          />
        </label>
        <button
          type="submit"
          disabled={addMutation.isPending}
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-45"
        >
          Add
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-[var(--danger-ink)]">{error}</p>}
    </section>
  );
}
