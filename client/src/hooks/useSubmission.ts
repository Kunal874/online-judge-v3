import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CreateSubmissionInput } from "@online-judge/shared";
import { createSubmission, fetchSubmission } from "../api/submissions";

const POLL_INTERVAL_MS = 1000;
const TERMINAL_VERDICTS = new Set([
  "ACCEPTED",
  "WRONG_ANSWER",
  "COMPILE_ERROR",
  "RUNTIME_ERROR",
  "TIME_LIMIT_EXCEEDED",
  "MEMORY_LIMIT_EXCEEDED",
  "INTERNAL_ERROR",
]);

export function useSubmission(problemId: string) {
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: (input: CreateSubmissionInput) => createSubmission(problemId, input),
    onSuccess: (data) => setSubmissionId(data.submissionId),
  });

  const submissionQuery = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: () => fetchSubmission(submissionId!),
    enabled: !!submissionId,
    refetchInterval: (query) => {
      const verdict = query.state.data?.verdict;
      return verdict && TERMINAL_VERDICTS.has(verdict) ? false : POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
  });

  const submission = submissionQuery.data;
  const isJudging = !!submissionId && (!submission || !TERMINAL_VERDICTS.has(submission.verdict));

  return {
    submit: (input: CreateSubmissionInput) => {
      setSubmissionId(null);
      submitMutation.mutate(input);
    },
    isSubmitting: submitMutation.isPending,
    submission,
    isJudging,
  };
}
