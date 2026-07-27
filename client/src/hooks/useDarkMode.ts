import { useSyncExternalStore } from "react";

const STORAGE_KEY = "theme";

// A module-level subscriber list rather than per-component useState: the
// navbar toggle and the Monaco editor both read this, and with independent
// state the editor would keep its old theme until something else happened
// to re-render it.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function useDarkMode() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function toggle() {
    const next = !getSnapshot();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Blocked storage — the theme still applies for this session.
    }
    listeners.forEach((listener) => listener());
  }

  return { isDark, toggle };
}
