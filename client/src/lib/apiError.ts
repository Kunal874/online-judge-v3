import { isAxiosError } from "axios";

interface ApiErrorBody {
  error?: string;
  /** Zod's flattened fieldErrors, sent by the API for 400s. */
  details?: Record<string, string[] | undefined>;
}

/** The API's own message for a failed request, or `fallback` if it didn't send one. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError<ApiErrorBody>(err)) return fallback;
  if (err.response) return err.response.data?.error ?? fallback;
  // No response at all — the request never reached the server. Saying
  // "something went wrong" here sends people hunting for a bug in their
  // code when the real problem is their connection.
  return "Couldn't reach the server. Check your connection and try again.";
}

/** Per-field validation messages from a 400, keyed by field name. */
export function apiFieldErrors(err: unknown): Record<string, string> {
  if (!isAxiosError<ApiErrorBody>(err)) return {};
  const details = err.response?.data?.details;
  if (!details) return {};

  const fields: Record<string, string> = {};
  for (const [field, messages] of Object.entries(details)) {
    if (messages?.length) fields[field] = messages[0];
  }
  return fields;
}

export function apiErrorStatus(err: unknown): number | undefined {
  return isAxiosError(err) ? err.response?.status : undefined;
}
