import { Navigate, Outlet } from "react-router-dom";
import type { PublicUser } from "@online-judge/shared";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ role }: { role?: PublicUser["role"] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return <Outlet />;
}
