import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../hooks/useDarkMode";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `text-[13px] transition-colors ${
    isActive ? "text-[var(--accent)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
  }`;
}

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <>
      {/* Persistent rather than a one-time message on the register page:
          someone who skipped verification has no other reminder that their
          account is unfinished. */}
      {user && !user.emailVerified && (
        <div className="bg-[var(--accent-tint)] px-4 py-2 text-center text-[13px] text-[var(--accent-ink)]">
          Your email isn&apos;t verified yet.{" "}
          <Link to="/verify-email" className="underline underline-offset-4">
            Enter your code
          </Link>
        </div>
      )}

      <nav className="flex h-15 flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
        <Link to="/" className="font-heading text-[19px] tracking-tight">
          Invariant
        </Link>

        <div className="flex flex-wrap items-center gap-4">
          <NavLink to="/problems" className={navLinkClass}>
            Problems
          </NavLink>
          <NavLink to="/roadmap" className={navLinkClass}>
            Roadmap
          </NavLink>
          <NavLink to="/contests" className={navLinkClass}>
            Contests
          </NavLink>
          {user && (
            <>
              <NavLink to="/submissions" className={navLinkClass}>
                Submissions
              </NavLink>
              <NavLink to="/analytics" className={navLinkClass}>
                Analytics
              </NavLink>
            </>
          )}
          {user?.role === "ADMIN" && (
            <>
              <NavLink to="/admin/problems" className={navLinkClass}>
                Problems admin
              </NavLink>
              <NavLink to="/admin/contests" className={navLinkClass}>
                Contests admin
              </NavLink>
            </>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-4 text-[13px]">
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
            className="rounded-full p-2 text-[var(--ink-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] hover:text-[var(--ink)]"
          >
            {isDark ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
                className="size-4"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1020.354 15.354z" />
              </svg>
            )}
          </button>

          {isLoading ? null : user ? (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-2 text-[var(--ink)] hover:text-[var(--accent)]"
              >
                <span className="grid size-7 place-items-center rounded-full bg-[var(--accent)] text-[11px] text-[var(--accent-contrast)] uppercase">
                  {user.handle.slice(0, 2)}
                </span>
                {user.handle}
              </Link>
              <button
                onClick={handleLogout}
                className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)]"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
