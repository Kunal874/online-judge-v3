import { useEffect, useState } from "react";

// Counts down to `target`, ticking once a second, then stops at zero. Used
// for the "starts in" / "ends in" text on contest pages, where a timestamp
// rendered once at page load would silently go stale while someone is
// competing.
//
// Only the clock is state; the remaining time is derived from it on each
// render. Storing the remainder instead would mean writing state from an
// effect every time `target` changed, purely to recompute something already
// knowable from the props.
export function useCountdown(target: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (!target) return null;
  return Math.max(0, new Date(target).getTime() - now);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
