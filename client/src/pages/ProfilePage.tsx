import { useAuth } from "../context/AuthContext";

// Placeholder — becomes the real profile page (solved count, acceptance
// rate, heatmap) in a later milestone. For now it just proves the
// protected-route + session flow works end to end.
export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <main className="mx-auto max-w-2xl px-4 py-24">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-2 text-slate-500">
        Logged in as <span className="font-medium text-slate-900 dark:text-slate-100">{user?.handle}</span> (
        {user?.email})
      </p>
    </main>
  );
}
