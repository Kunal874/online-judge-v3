import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { RunRequest } from "@online-judge/shared";
import { createRun, fetchRunStatus } from "../api/run";

const POLL_INTERVAL_MS = 1000;

export function useRunJob() {
  const [jobId, setJobId] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: (input: RunRequest) => createRun(input),
    onSuccess: (data) => setJobId(data.jobId),
  });

  const statusQuery = useQuery({
    queryKey: ["run", jobId],
    queryFn: () => fetchRunStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : POLL_INTERVAL_MS;
    },
    // Keep polling even if the user switches tabs while waiting — a run
    // usually resolves in a couple of seconds either way, and coming back
    // to a stale "Running..." would be a worse experience than a handful
    // of background requests.
    refetchIntervalInBackground: true,
  });

  return {
    submit: (input: RunRequest) => {
      setJobId(null);
      submitMutation.mutate(input);
    },
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.isError,
    jobStatus: statusQuery.data,
    isRunning: !!jobId && (!statusQuery.data || ["waiting", "active", "delayed"].includes(statusQuery.data.status)),
  };
}
