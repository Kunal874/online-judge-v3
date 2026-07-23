import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { fetchUserProfile } from "../api/users";
import Heatmap from "../components/profile/Heatmap";

export default function ProfilePage() {
  const { user } = useAuth();

  const { data: profile, isPending } = useQuery({
    queryKey: ["profile", user?.handle],
    queryFn: () => fetchUserProfile(user!.handle),
    enabled: !!user,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-2 text-slate-500">
        <span className="font-medium text-slate-900 dark:text-slate-100">{user?.handle}</span> (
        {user?.email})
      </p>

      {isPending && <p className="mt-6 text-slate-500">Loading stats...</p>}

      {profile && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Problems Solved" value={profile.solvedCount} />
            <Stat label="Acceptance Rate" value={`${profile.acceptanceRate}%`} />
            <Stat label="Total Submissions" value={profile.totalSubmissions} />
          </div>

          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">
              Submission Activity (last year)
            </h2>
            <Heatmap entries={profile.heatmap} />
          </div>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-slate-200 p-4 dark:border-slate-700">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
