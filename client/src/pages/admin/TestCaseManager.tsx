import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TestCase } from "@online-judge/shared";
import {
  createTestCase,
  deleteTestCase,
  fetchTestCases,
  updateTestCase,
} from "../../api/testcases";

const inputClass =
  "w-full rounded border border-[var(--edge)] bg-transparent px-2 py-1 text-xs font-mono ";

export default function TestCaseManager({ problemId }: { problemId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["testcases", problemId];

  const { data: testCases } = useQuery({
    queryKey,
    queryFn: () => fetchTestCases(problemId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: () =>
      createTestCase(problemId, { input: "", expectedOutput: "", isHidden: true, orderIndex: 0 }),
    onSuccess: invalidate,
  });

  return (
    <section className="mt-10 border-t border-[var(--edge)] pt-6 ">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Test Cases</h2>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-45"
        >
          Add Test Case
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {testCases?.map((tc, i) => (
          <TestCaseRow key={tc.id} testCase={tc} index={i} problemId={problemId} onChange={invalidate} />
        ))}
        {testCases?.length === 0 && (
          <p className="text-sm text-[var(--ink-muted)]">No test cases yet. Add at least one before publishing.</p>
        )}
      </div>
    </section>
  );
}

function TestCaseRow({
  testCase,
  index,
  problemId,
  onChange,
}: {
  testCase: TestCase;
  index: number;
  problemId: string;
  onChange: () => void;
}) {
  const [input, setInput] = useState(testCase.input);
  const [expectedOutput, setExpectedOutput] = useState(testCase.expectedOutput);
  const [isHidden, setIsHidden] = useState(testCase.isHidden);
  const [dirty, setDirty] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateTestCase(problemId, testCase.id, { input, expectedOutput, isHidden }),
    onSuccess: () => {
      setDirty(false);
      onChange();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTestCase(problemId, testCase.id),
    onSuccess: onChange,
  });

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setDirty(true);
    };
  }

  return (
    <div className="rounded border border-[var(--edge)] p-3 ">
      <div className="mb-2 flex items-center justify-between text-xs text-[var(--ink-muted)]">
        <span>Test Case #{index + 1}</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={isHidden}
              onChange={(e) => markDirty(setIsHidden)(e.target.checked)}
            />
            Hidden
          </label>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
            className="text-[var(--accent)] disabled:opacity-40"
          >
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete test case #${index + 1}?`)) deleteMutation.mutate();
            }}
            className="text-[var(--danger-ink)]"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <textarea
          value={input}
          onChange={(e) => markDirty(setInput)(e.target.value)}
          placeholder="Input"
          className={`${inputClass} min-h-20`}
        />
        <textarea
          value={expectedOutput}
          onChange={(e) => markDirty(setExpectedOutput)(e.target.value)}
          placeholder="Expected output"
          className={`${inputClass} min-h-20`}
        />
      </div>
    </div>
  );
}
