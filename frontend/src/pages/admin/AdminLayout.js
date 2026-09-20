import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { LayoutDashboard, Package, FileText, Users, Truck, Bus, LifeBuoy, ScrollText, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import NotificationsBell from "@/components/NotificationsBell";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", end: true, label: "Overview", icon: LayoutDashboard },
  { to: "/admin/shipments", label: "Shipments", icon: Package },
  { to: "/admin/quotes", label: "Quotes", icon: FileText },
  { to: "/admin/couriers", label: "Couriers", icon: Truck },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/vehicles", label: "Vehicles", icon: Bus },
  { to: "/admin/support", label: "Support", icon: LifeBuoy },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800 bg-[#0F172A] lg:flex">
        <Link to="/" className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-600"><Truck className="h-4 w-4 text-white" /></span>
          <span className="font-bold text-white">Rapid<span className="text-sky-400">Express</span></span>
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={`nav-${n.label.toLowerCase().replace(/ /g, "-")}`}
              className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <button onClick={() => { logout(); navigate("/login"); }} data-testid="admin-logout" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-5 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0F172A]"><Truck className="h-4 w-4 text-white" /></span>
            <span className="font-bold text-slate-900">RapidExpress</span>
          </div>
          <span className="hidden text-sm text-slate-500 lg:block">Admin Console</span>
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium text-slate-700 sm:block">{user?.name}</span>
            </div>
          </div>
        </header>
        <main className="p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
