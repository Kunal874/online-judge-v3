import { useSearchParams } from "react-router-dom";

// Where to send the user after logging in or registering.
//
// Only same-site absolute paths are honoured. Echoing an arbitrary `next`
// back into navigate() would make the login form an open redirect: a
// phishing page could link to /login?next=https://evil.example and the
// site itself would hand the freshly-authenticated user over. Rejecting
// anything not starting with a single "/" blocks both absolute URLs and
// protocol-relative "//evil.example" ones.
export function useNextPath(fallback = "/"): string {
  const [params] = useSearchParams();
  const next = params.get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
