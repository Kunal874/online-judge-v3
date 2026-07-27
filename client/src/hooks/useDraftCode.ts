import { useCallback, useEffect, useState } from "react";
import type { Language } from "@online-judge/shared";
import { LANGUAGE_STUBS } from "../lib/languageStubs";

const PREFIX = "oj:draft:";

function keyFor(problemId: string, language: Language) {
  // Keyed by language as well as problem: switching C++ to Python and back
  // should return your C++ attempt, not overwrite it with a stub.
  return `${PREFIX}${problemId}:${language}`;
}

function read(problemId: string, language: Language, fallback: string): string {
  try {
    return localStorage.getItem(keyFor(problemId, language)) ?? fallback;
  } catch {
    // Private browsing and blocked-storage modes throw on access rather than
    // returning null. A missing draft isn't worth breaking the editor over.
    return fallback;
  }
}

/**
 * Editor contents that survive a reload.
 *
 * Losing half an hour of work to an accidental refresh is the kind of thing
 * people don't forgive a judge for, and the fix is small. Drafts live in
 * localStorage rather than on the server: they're per-device scratch work,
 * not submissions, and nobody wants an unfinished attempt syncing anywhere.
 */
export function useDraftCode(problemId: string, language: Language) {
  const stub = LANGUAGE_STUBS[language];
  const [code, setCode] = useState(() => read(problemId, language, stub));

  // Reloading a different draft is a render-time adjustment, not an effect.
  // Doing it in an effect would paint one frame of the previous problem's
  // code before correcting itself, and costs an extra render either way.
  const [loadedKey, setLoadedKey] = useState(() => keyFor(problemId, language));
  const currentKey = keyFor(problemId, language);
  if (currentKey !== loadedKey) {
    setLoadedKey(currentKey);
    setCode(read(problemId, language, stub));
  }

  useEffect(() => {
    try {
      // An untouched buffer is stored as nothing at all, so a stub never
      // becomes a "draft" that outlives a change to the starter code.
      if (code === stub) localStorage.removeItem(currentKey);
      else localStorage.setItem(currentKey, code);
    } catch {
      // Storage full or unavailable — the editor still works, the draft just
      // won't outlive the tab.
    }
  }, [code, stub, currentKey]);

  const reset = useCallback(() => setCode(stub), [stub]);

  return { code, setCode, reset, isDirty: code !== stub };
}
