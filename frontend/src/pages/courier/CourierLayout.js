import { Outlet, useNavigate } from "react-router-dom";
import { Truck, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import NotificationsBell from "@/components/NotificationsBell";

export default function CourierLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0F172A]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#F8FAFC] shadow-2xl">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-[#0F172A] px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-600"><Truck className="h-4 w-4 text-white" /></span>
            <div>
              <p className="text-sm font-bold text-white">Courier</p>
              <p className="text-xs text-slate-400">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell dark />
            <button onClick={() => { logout(); navigate("/login"); }} data-testid="courier-logout" className="rounded-full p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
