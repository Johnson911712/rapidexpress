import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { Truck, Package, User, LifeBuoy, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import NotificationsBell from "@/components/NotificationsBell";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/portal", end: true, label: "My Shipments", icon: Package },
  { to: "/portal/support", label: "Support", icon: LifeBuoy },
  { to: "/portal/profile", label: "Profile", icon: User },
];

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0F172A]"><Truck className="h-5 w-5 text-white" /></span>
            <span className="text-lg font-bold tracking-tight text-slate-900">Rapid<span className="text-sky-600">Express</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <button onClick={() => { logout(); navigate("/login"); }} data-testid="portal-logout" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8">
        <nav className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} data-testid={`portal-nav-${n.label.toLowerCase().replace(/ /g, "-")}`}
              className={({ isActive }) => cn("flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
    </div>
  );
}
