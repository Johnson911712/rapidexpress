import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, homeFor } from "@/context/AuthContext";

export default function LoginPage() {
  const { login, apiErr } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const user = await login(email, password);
      navigate(homeFor(user.role));
    } catch (err) {
      setError(apiErr(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-[#0F172A] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-600"><Truck className="h-5 w-5 text-white" /></span>
          <span className="text-lg font-bold text-white">Rapid<span className="text-sky-400">Express</span></span>
        </Link>
        <div>
          <h2 className="text-3xl font-semibold text-white">Your logistics control tower.</h2>
          <p className="mt-3 max-w-sm text-slate-400">Sign in to manage shipments, run deliveries, or track your orders.</p>
        </div>
        <p className="text-sm text-slate-500">© {new Date().getFullYear()} Rapid Express Logistics</p>
      </div>

      <div className="flex items-center justify-center bg-[#F8FAFC] px-5 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back. Enter your credentials.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" data-testid="login-email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" data-testid="login-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
            </div>
            {error && <p data-testid="login-error" className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} data-testid="login-submit" className="w-full rounded-md bg-sky-600 hover:bg-sky-700">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-slate-500">
            No account? <Link to="/register" className="font-medium text-sky-700 hover:text-sky-900" data-testid="link-register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
