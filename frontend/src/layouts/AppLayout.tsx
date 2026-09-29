import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FilePlus2,
  ListChecks,
  Bell,
  Menu,
  ChevronLeft,
  Activity,
  Map,
  Layers,
  Users,
  Building2,
  ScrollText,
  BrainCircuit,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import { cn } from "@/utils/cn";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LogoMark } from "@/components/Logo";
import type { Notification } from "@/types";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
}

const citizenNav: NavItem[] = [
  { to: "/app/citizen", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/report", label: "Report an Issue", icon: FilePlus2 },
  { to: "/app/complaints", label: "My Complaints", icon: ListChecks },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
];

const officerNav: NavItem[] = [
  { to: "/app/officer", label: "Operations", icon: LayoutDashboard, end: true },
  { to: "/app/officer/complaints", label: "Complaints", icon: ListChecks },
  { to: "/app/officer/recurring", label: "Recurring Issues", icon: Layers },
  { to: "/app/officer/map", label: "Civic Map", icon: Map },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
];

const adminNav: NavItem[] = [
  { to: "/app/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/admin/users", label: "Users", icon: Users },
  { to: "/app/admin/departments", label: "Departments", icon: Building2 },
  { to: "/app/officer/recurring", label: "Recurring Issues", icon: Layers },
  { to: "/app/admin/memory", label: "Memory Monitor", icon: BrainCircuit },
  { to: "/app/admin/audit", label: "Audit Logs", icon: ScrollText },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const location = useLocation();

  const nav =
    user?.role === "admin" ? adminNav : user?.role === "officer" ? officerNav : citizenNav;

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get<Notification[]>("/api/notifications")).data,
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unread = notifications?.filter((n) => !n.is_read).length ?? 0;
  const crumbs = location.pathname.replace("/app", "").split("/").filter(Boolean);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-navy-700 bg-navy-800 text-slate-100 transition-all duration-200",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-navy-700 px-4">
          <LogoMark className="h-9 w-9 shrink-0 text-white" />
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight">
              City<span className="text-teal-400">Fix</span>
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-teal-500/15 text-teal-300"
                    : "text-slate-300 hover:bg-navy-700 hover:text-white"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden items-center gap-2 border-t border-navy-700 px-4 py-3 text-sm text-slate-400 hover:text-white lg:flex"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </button>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-navy-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className={cn("flex min-w-0 flex-1 flex-col", collapsed ? "lg:pl-16" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-6 w-6 text-slate-600" />
          </button>

          <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm text-slate-500">
            <Link to="/app" className="hover:text-slate-800">
              Home
            </Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5" />
                <span className={cn(i === crumbs.length - 1 && "font-medium text-slate-800")}>
                  {c.replace(/-/g, " ")}
                </span>
              </span>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-soft">
                  <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-navy-800">
                    Notifications
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {(notifications ?? []).slice(0, 8).map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "border-b border-slate-50 px-4 py-3 text-sm",
                          !n.is_read && "bg-teal-50/40"
                        )}
                      >
                        <p className="font-medium text-slate-800">{n.title}</p>
                        {n.body && <p className="text-xs text-slate-500">{n.body}</p>}
                      </div>
                    ))}
                    {(!notifications || notifications.length === 0) && (
                      <p className="px-4 py-6 text-center text-sm text-slate-400">
                        No notifications
                      </p>
                    )}
                  </div>
                  <Link
                    to="/app/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-teal-600 hover:bg-slate-50"
                  >
                    View all
                  </Link>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-[140px] truncate text-sm font-medium text-slate-800">{user?.full_name}</p>
                <p className="text-xs capitalize text-slate-500">{user?.role}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-sm font-semibold text-white">
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="w-full min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">
          <div className="mx-auto w-full max-w-7xl">
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
