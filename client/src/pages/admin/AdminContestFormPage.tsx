import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  createContest,
  fetchAdminContest,
  updateContest,
  type AdminContest,
} from "../../api/contests";
import ContestProblemManager from "./ContestProblemManager";

interface FormState {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
}

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time,
// while the API speaks ISO-8601 UTC — these two convert between them.
function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromLocalInputValue(local: string): string {
  return new Date(local).toISOString();
}

function defaultForm(): FormState {
  const start = new Date(Date.now() + 24 * 3600_000);
  const end = new Date(start.getTime() + 2 * 3600_000);
  return {
    title: "",
    description: "",
    startsAt: toLocalInputValue(start.toISOString()),
    endsAt: toLocalInputValue(end.toISOString()),
    isPublished: false,
  };
}

function toFormState(contest: AdminContest): FormState {
  return {
    title: contest.title,
    description: contest.description,
    startsAt: toLocalInputValue(contest.startsAt),
    endsAt: toLocalInputValue(contest.endsAt),
    isPublished: contest.isPublished,
  };
}

const inputClass =
  "w-full rounded border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600";

// Same shape as AdminProblemFormPage: load first, then mount the form so
// its initial state comes from a useState initializer rather than an effect.
export default function AdminContestFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const { data: existing, isPending } = useQuery({
    queryKey: ["admin-contest", id],
    queryFn: () => fetchAdminContest(id!),
    enabled: isEditing,
  });

  if (isEditing && isPending) return <p className="p-8 text-slate-500">Loading...</p>;

  return (
    <ContestForm
      id={id}
      isEditing={isEditing}
      initial={existing ? toFormState(existing) : defaultForm()}
    />
  );
}

function ContestForm({
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
        title: form.title,
        description: form.description,
        startsAt: fromLocalInputValue(form.startsAt),
        endsAt: fromLocalInputValue(form.endsAt),
        isPublished: form.isPublished,
      };
      // The API takes dates; strings are coerced by the shared schema.
      return isEditing
        ? updateContest(id!, payload as never)
        : createContest(payload as never);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contests"] });
      navigate("/admin/contests");
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
      <h1 className="mb-6 text-2xl font-semibold">{isEditing ? "Edit Contest" : "New Contest"}</h1>

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
          Description
          <textarea
            className={`${inputClass} min-h-24`}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Starts at
            <input
              type="datetime-local"
              className={inputClass}
              value={form.startsAt}
              onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              required
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Ends at
            <input
              type="datetime-local"
              className={inputClass}
              value={form.endsAt}
              onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              required
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

      {isEditing && id && <ContestProblemManager contestId={id} />}
    </main>
  );
}
