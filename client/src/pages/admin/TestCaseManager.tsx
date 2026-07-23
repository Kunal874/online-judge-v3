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
  "w-full rounded border border-slate-300 bg-transparent px-2 py-1 text-xs font-mono dark:border-slate-600";

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
    <section className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-700">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Test Cases</h2>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Add Test Case
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {testCases?.map((tc, i) => (
          <TestCaseRow key={tc.id} testCase={tc} index={i} problemId={problemId} onChange={invalidate} />
        ))}
        {testCases?.length === 0 && (
          <p className="text-sm text-slate-500">No test cases yet. Add at least one before publishing.</p>
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
    <div className="rounded border border-slate-200 p-3 dark:border-slate-700">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
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
            className="text-blue-600 disabled:opacity-40 dark:text-blue-400"
          >
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete test case #${index + 1}?`)) deleteMutation.mutate();
            }}
            className="text-red-600 dark:text-red-400"
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
