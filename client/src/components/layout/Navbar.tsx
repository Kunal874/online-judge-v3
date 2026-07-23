import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
      <div className="flex items-center gap-4">
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
      <div className="flex items-center gap-4 text-sm">
        {isLoading ? null : user ? (
          <>
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
