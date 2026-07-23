import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import type { Difficulty } from "@online-judge/shared";
import { createProblem, fetchAdminProblem, updateProblem, type AdminProblem } from "../../api/problems";
import TestCaseManager from "./TestCaseManager";

interface FormState {
  title: string;
  statement: string;
  difficulty: Difficulty;
  tags: string;
  constraints: string;
  timeLimitMs: number;
  memoryLimitKb: number;
  isPublished: boolean;
}

const EMPTY: FormState = {
  title: "",
  statement: "",
  difficulty: "EASY",
  tags: "",
  constraints: "",
  timeLimitMs: 2000,
  memoryLimitKb: 262144,
  isPublished: false,
};

function toFormState(problem: AdminProblem): FormState {
  return {
    title: problem.title,
    statement: problem.statement,
    difficulty: problem.difficulty,
    tags: problem.tags.join(", "),
    constraints: problem.constraints ?? "",
    timeLimitMs: problem.timeLimitMs,
    memoryLimitKb: problem.memoryLimitKb,
    isPublished: problem.isPublished,
  };
}

const inputClass =
  "w-full rounded border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600";

// Loads existing data (if editing) before ProblemForm ever mounts, so the
// form's initial state can come straight from a useState initializer
// instead of being synced in after the fact via an effect.
export default function AdminProblemFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const { data: existing, isPending } = useQuery({
    queryKey: ["admin-problem", id],
    queryFn: () => fetchAdminProblem(id!),
    enabled: isEditing,
  });

  if (isEditing && isPending) return <p className="p-8 text-slate-500">Loading...</p>;

  return (
    <ProblemForm id={id} isEditing={isEditing} initial={existing ? toFormState(existing) : EMPTY} />
  );
}

function ProblemForm({
  id,
  isEditing,
  initial,
}: {
  id: string | undefined;
  isEditing: boolean;
  initial: FormState;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        constraints: form.constraints || undefined,
      };
      return isEditing ? updateProblem(id!, payload) : createProblem(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-problems"] });
      navigate("/admin/problems");
    },
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await saveMutation.mutateAsync();
    } catch (err) {
      setError(isAxiosError(err) ? (err.response?.data?.error ?? "Save failed") : "Save failed");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">{isEditing ? "Edit Problem" : "New Problem"}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Statement (Markdown)
          <textarea
            className={`${inputClass} min-h-40 font-mono`}
            value={form.statement}
            onChange={(e) => setForm((f) => ({ ...f, statement: e.target.value }))}
            required
          />
        </label>

        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Difficulty
            <select
              className={inputClass}
              value={form.difficulty}
              onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as Difficulty }))}
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Tags (comma-separated)
            <input
              className={inputClass}
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Constraints
          <textarea
            className={`${inputClass} min-h-20`}
            value={form.constraints}
            onChange={(e) => setForm((f) => ({ ...f, constraints: e.target.value }))}
          />
        </label>

        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Time limit (ms)
            <input
              type="number"
              className={inputClass}
              value={form.timeLimitMs}
              onChange={(e) => setForm((f) => ({ ...f, timeLimitMs: Number(e.target.value) }))}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Memory limit (KB)
            <input
              type="number"
              className={inputClass}
              value={form.memoryLimitKb}
              onChange={(e) => setForm((f) => ({ ...f, memoryLimitKb: Number(e.target.value) }))}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
          />
          Published (visible to everyone)
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </button>
      </form>

      {isEditing && id && <TestCaseManager problemId={id} />}
    </main>
  );
}
