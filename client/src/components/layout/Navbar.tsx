import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDarkMode } from "../../hooks/useDarkMode";

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-y-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/" className="font-semibold">
          Online Judge
        </Link>
        <Link to="/problems" className="text-sm">
          Problems
        </Link>
        {user?.role === "ADMIN" && (
          <Link to="/admin/problems" className="text-sm">
            Admin
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <button
          onClick={toggle}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {isDark ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <circle cx="12" cy="12" r="4" />
              <path
                strokeLinecap="round"
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1020.354 15.354z" />
            </svg>
          )}
        </button>
        {isLoading ? null : user ? (
          <>
            <Link to="/submissions">Submissions</Link>
            <Link to="/profile">{user.handle}</Link>
            <button onClick={handleLogout} className="text-slate-500 hover:underline">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
