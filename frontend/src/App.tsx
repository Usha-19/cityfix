import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import type { Role } from "./types";

import LandingPage from "./pages/LandingPage";
import DemoPage from "./pages/DemoPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AppLayout from "./layouts/AppLayout";

import CitizenDashboard from "./pages/citizen/CitizenDashboard";
import ReportIssue from "./pages/citizen/ReportIssue";
import MyComplaints from "./pages/citizen/MyComplaints";
import ComplaintDetailPage from "./pages/citizen/ComplaintDetailPage";
import NotificationsPage from "./pages/NotificationsPage";

import OfficerDashboard from "./pages/officer/OfficerDashboard";
import ComplaintManagement from "./pages/officer/ComplaintManagement";
import InvestigationPage from "./pages/officer/InvestigationPage";
import RecurringIssues from "./pages/officer/RecurringIssues";
import ClusterDetailPage from "./pages/officer/ClusterDetailPage";
import CivicMapPage from "./pages/officer/CivicMapPage";

import AdminOverview from "./pages/admin/AdminOverview";
import UserManagement from "./pages/admin/UserManagement";
import Departments from "./pages/admin/Departments";
import AuditLogs from "./pages/admin/AuditLogs";
import MemoryMonitoring from "./pages/admin/MemoryMonitoring";

function Protected({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/app/admin" replace />;
  if (user.role === "officer") return <Navigate to="/app/officer" replace />;
  return <Navigate to="/app/citizen" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/app" element={<AppLayout />}>
        <Route index element={<HomeRedirect />} />

        {/* Citizen */}
        <Route
          path="citizen"
          element={
            <Protected roles={["citizen"]}>
              <CitizenDashboard />
            </Protected>
          }
        />
        <Route
          path="report"
          element={
            <Protected roles={["citizen"]}>
              <ReportIssue />
            </Protected>
          }
        />
        <Route
          path="complaints"
          element={
            <Protected roles={["citizen"]}>
              <MyComplaints />
            </Protected>
          }
        />
        <Route
          path="complaints/:id"
          element={
            <Protected roles={["citizen", "officer", "admin"]}>
              <ComplaintDetailPage />
            </Protected>
          }
        />
        <Route
          path="notifications"
          element={
            <Protected roles={["citizen", "officer", "admin"]}>
              <NotificationsPage />
            </Protected>
          }
        />

        {/* Officer */}
        <Route
          path="officer"
          element={
            <Protected roles={["officer", "admin"]}>
              <OfficerDashboard />
            </Protected>
          }
        />
        <Route
          path="officer/complaints"
          element={
            <Protected roles={["officer", "admin"]}>
              <ComplaintManagement />
            </Protected>
          }
        />
        <Route
          path="officer/complaints/:id"
          element={
            <Protected roles={["officer", "admin"]}>
              <InvestigationPage />
            </Protected>
          }
        />
        <Route
          path="officer/recurring"
          element={
            <Protected roles={["officer", "admin"]}>
              <RecurringIssues />
            </Protected>
          }
        />
        <Route
          path="officer/recurring/:id"
          element={
            <Protected roles={["officer", "admin"]}>
              <ClusterDetailPage />
            </Protected>
          }
        />
        <Route
          path="officer/map"
          element={
            <Protected roles={["officer", "admin"]}>
              <CivicMapPage />
            </Protected>
          }
        />

        {/* Admin */}
        <Route
          path="admin"
          element={
            <Protected roles={["admin"]}>
              <AdminOverview />
            </Protected>
          }
        />
        <Route
          path="admin/users"
          element={
            <Protected roles={["admin"]}>
              <UserManagement />
            </Protected>
          }
        />
        <Route
          path="admin/departments"
          element={
            <Protected roles={["admin"]}>
              <Departments />
            </Protected>
          }
        />
        <Route
          path="admin/audit"
          element={
            <Protected roles={["admin"]}>
              <AuditLogs />
            </Protected>
          }
        />
        <Route
          path="admin/memory"
          element={
            <Protected roles={["admin"]}>
              <MemoryMonitoring />
            </Protected>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
