import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, homeFor } from "@/context/AuthContext";

export default function RegisterPage() {
  const { register, apiErr } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const user = await register(form);
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
          <h2 className="text-3xl font-semibold text-white">Ship smarter, track everything.</h2>
          <p className="mt-3 max-w-sm text-slate-400">Create a free customer account to request quotes, pay online, and follow every shipment.</p>
        </div>
        <p className="text-sm text-slate-500">© {new Date().getFullYear()} Rapid Express Logistics</p>
      </div>

      <div className="flex items-center justify-center bg-[#F8FAFC] px-5 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create account</h1>
          <p className="mt-1 text-sm text-slate-500">It only takes a moment.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" data-testid="register-name" required value={form.name} onChange={set("name")} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" data-testid="register-email" required value={form.email} onChange={set("email")} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" data-testid="register-phone" value={form.phone} onChange={set("phone")} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" data-testid="register-password" required minLength={6} value={form.password} onChange={set("password")} className="mt-1.5" />
            </div>
            {error && <p data-testid="register-error" className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} data-testid="register-submit" className="w-full rounded-md bg-sky-600 hover:bg-sky-700">
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-slate-500">
            Already have an account? <Link to="/login" className="font-medium text-sky-700 hover:text-sky-900" data-testid="link-login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
