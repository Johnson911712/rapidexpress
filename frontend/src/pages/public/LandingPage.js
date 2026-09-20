import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldCheck, Clock, Globe2, ArrowRight, Boxes, Route } from "lucide-react";
import PublicNav from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HERO = "https://images.unsplash.com/photo-1606185540834-d6e7483ee1a4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwyfHxjYXJnbyUyMHNoaXAlMjBhZXJpYWx8ZW58MHx8fHwxNzg5ODY3NTA0fDA&ixlib=rb-4.1.0&q=85";
const WAREHOUSE = "https://images.unsplash.com/photo-1592085198739-ffcad7f36b54?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsb2dpc3RpY3MlMjB3YXJlaG91c2V8ZW58MHx8fHwxNzg5ODY3NTA0fDA&ixlib=rb-4.1.0&q=85";

export default function LandingPage() {
  const [tn, setTn] = useState("");
  const navigate = useNavigate();

  const track = (e) => {
    e.preventDefault();
    if (tn.trim()) navigate(`/track/${tn.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0F172A]">
        <img src={HERO} alt="Cargo shipping" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-[#0F172A]/60" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Freight · Courier · Last-Mile</span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Move every parcel with precision.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              Rapid Express Logistics tracks your shipments end to end — from pickup to signed delivery — with real-time status and full visibility.
            </p>

            <form onSubmit={track} className="mt-8 flex max-w-md gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  data-testid="hero-tracking-input"
                  value={tn}
                  onChange={(e) => setTn(e.target.value)}
                  placeholder="Enter tracking number (e.g. RX...)"
                  className="h-12 rounded-full border-0 bg-white pl-10 text-slate-900"
                />
              </div>
              <Button type="submit" data-testid="hero-track-btn" className="h-12 rounded-full bg-sky-600 px-6 hover:bg-sky-700">
                Track <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </form>
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-300">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-sky-400" /> Secure delivery proof</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-sky-400" /> Live status timeline</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { icon: Route, title: "End-to-end tracking", text: "Every shipment writes a status timeline — Order Created to Delivered — visible to you and your customers." },
            { icon: Boxes, title: "Courier delivery flow", text: "Field couriers update status, capture photo + signature proof, and reconcile cash-on-delivery from any phone." },
            { icon: Globe2, title: "Instant quotes", text: "Request a freight quote in seconds. Our team prices it and turns it into a live, trackable shipment." },
          ].map((f, i) => (
            <div key={i} className="group rounded-lg border border-slate-200 bg-white p-6 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-sky-50 text-sky-600">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Split */}
      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <div className="grid items-center gap-10 rounded-2xl border border-slate-200 bg-white p-8 md:grid-cols-2 lg:p-12">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Operations built for scale</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              A control tower for your entire fleet.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Create shipments, assign couriers and vehicles, set prices, and monitor delivery performance — all from one dense, fast admin dashboard.
            </p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => navigate("/quote")} data-testid="cta-quote" className="rounded-full bg-sky-600 hover:bg-sky-700">Request a Quote</Button>
              <Button variant="outline" onClick={() => navigate("/register")} data-testid="cta-register" className="rounded-full border-slate-300">Create Account</Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl">
            <img src={WAREHOUSE} alt="Logistics warehouse" className="h-72 w-full object-cover" />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} Rapid Express Logistics. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
