import { Link, useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, homeFor } from "@/context/AuthContext";

export default function PublicNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/" data-testid="brand-logo" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0F172A]">
            <Truck className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">Rapid<span className="text-sky-600">Express</span></span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/track" className="text-sm font-medium text-slate-600 transition-colors hover:text-sky-600" data-testid="nav-track">Track Shipment</Link>
          <Link to="/quote" className="text-sm font-medium text-slate-600 transition-colors hover:text-sky-600" data-testid="nav-quote">Get a Quote</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button onClick={() => navigate(homeFor(user.role))} data-testid="nav-dashboard" className="rounded-full bg-sky-600 hover:bg-sky-700">Dashboard</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/login")} data-testid="nav-login" className="rounded-full text-slate-700 hover:bg-slate-100">Sign In</Button>
              <Button onClick={() => navigate("/register")} data-testid="nav-register" className="rounded-full bg-sky-600 hover:bg-sky-700">Register</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
