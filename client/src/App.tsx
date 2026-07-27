import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import RoadmapPage from "./pages/RoadmapPage";
import ProblemListPage from "./pages/ProblemListPage";
import ProblemDetailPage from "./pages/ProblemDetailPage";
import ContestListPage from "./pages/ContestListPage";
import ContestDetailPage from "./pages/ContestDetailPage";
import ContestProblemPage from "./pages/ContestProblemPage";
import ContestLeaderboardPage from "./pages/ContestLeaderboardPage";
import SubmissionsPage from "./pages/SubmissionsPage";
import SubmissionDetailPage from "./pages/SubmissionDetailPage";
import AdminProblemsPage from "./pages/admin/AdminProblemsPage";
import AdminProblemFormPage from "./pages/admin/AdminProblemFormPage";
import AdminContestsPage from "./pages/admin/AdminContestsPage";
import AdminContestFormPage from "./pages/admin/AdminContestFormPage";
import Navbar from "./components/layout/Navbar";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import RequireVerified from "./components/layout/RequireVerified";

export default function App() {
  return (
    // A full-height shell with the navbar fixed and the routed page taking
    // the rest. The workspace needs to size itself against the viewport, and
    // subtracting a hard-coded navbar height breaks the moment the
    // unverified-email banner appears above it.
    <div className="flex h-dvh flex-col">
      <div className="shrink-0">
        <Navbar />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Routes>
        {/* Outside the guard on purpose — it's the one place an unverified,
            signed-in user is allowed to land instead of being bounced. */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route element={<RequireVerified />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/problems" element={<ProblemListPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/problems/:slug" element={<ProblemDetailPage />} />
          <Route path="/contests" element={<ContestListPage />} />
          <Route path="/contests/:slug" element={<ContestDetailPage />} />
          <Route path="/contests/:slug/leaderboard" element={<ContestLeaderboardPage />} />
          <Route path="/contests/:slug/problems/:label" element={<ContestProblemPage />} />
          {/* Public: the profile is the artefact people link to. */}
          <Route path="/u/:handle" element={<ProfilePage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
            <Route path="/submissions/:id" element={<SubmissionDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute role="ADMIN" />}>
            <Route path="/admin/problems" element={<AdminProblemsPage />} />
            <Route path="/admin/problems/new" element={<AdminProblemFormPage />} />
            <Route path="/admin/problems/:id/edit" element={<AdminProblemFormPage />} />
            <Route path="/admin/contests" element={<AdminContestsPage />} />
            <Route path="/admin/contests/new" element={<AdminContestFormPage />} />
            <Route path="/admin/contests/:id/edit" element={<AdminContestFormPage />} />
            </Route>
          </Route>
        </Routes>
      </div>
    </div>
  );
}
