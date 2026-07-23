import { useState } from "react";

function isDarkNow(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(isDarkNow);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  }

  return { isDark, toggle };
}
