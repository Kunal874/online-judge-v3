import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Sits above every route except /verify-email itself. A signed-in user with
// an unverified email is redirected there no matter what they navigate to —
// there is deliberately no page that lets them go do something else first.
//
// Signed-out visitors pass through untouched: `user` is null for them, so
// this only ever acts on accounts that exist and haven't finished signup.
export default function RequireVerified() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (user && !user.emailVerified) {
    return <Navigate to={`/verify-email?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return <Outlet />;
}
