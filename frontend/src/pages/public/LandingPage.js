import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Search, ShieldCheck, Clock, Globe2, ArrowRight, Boxes, Route, Truck,
  Package, PackageCheck, MapPin, Home, Star, PhoneCall, BarChart3, Camera, Quote,
  Building2, Store, Factory, MoonStar,
} from "lucide-react";
import PublicNav from "@/components/PublicNav";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HERO_POSTER = "https://images.unsplash.com/photo-1606185540834-d6e7483ee1a4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwyfHxjYXJnbyUyMHNoaXAlMjBhZXJpYWx8ZW58MHx8fHwxNzg5ODY3NTA0fDA&ixlib=rb-4.1.0&q=85";
const HERO_VIDEO = "https://videos.pexels.com/video-files/4000033/4000033-hd_1920_1080_30fps.mp4";
const FLEET_VIDEO = "https://videos.pexels.com/video-files/3940509/3940509-hd_1920_1080_30fps.mp4";
const FLEET_POSTER = "https://images.unsplash.com/photo-1766785368863-f2188a8c8b32?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHw0fHxsb2dpc3RpY3MlMjBkZWxpdmVyeSUyMHRydWNrcyUyMGhpZ2h3YXl8ZW58MHx8fHwxNzg5ODY5ODQxfDA&ixlib=rb-4.1.0&q=85";
const CONTROL = "https://images.unsplash.com/photo-1716191300006-ea66bf47e2b9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBhdXRvbWF0ZWQlMjB3YXJlaG91c2UlMjByb2JvdGljcyUyMGxvZ2lzdGljcyUyMHRlY2hub2xvZ3l8ZW58MHx8fHwxNzg5ODcxMjY0fDA&ixlib=rb-4.1.0&q=85";

const EASE = [0.22, 1, 0.36, 1];

function Reveal({ children, delay = 0, y = 28, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: EASE }} className={className}>
      {children}
    </motion.div>
  );
}

function Counter({ to, suffix = "", duration = 1.8, decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start, raf;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / (duration * 1000), 1);
      setVal((1 - Math.pow(1 - p, 3)) * to);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  const shown = decimals ? val.toFixed(decimals) : Math.floor(val).toLocaleString();
  return <span ref={ref}>{shown}{suffix}</span>;
}

export default function LandingPage() {
  const [tn, setTn] = useState("");
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const heroFade = useTransform(scrollYProgress, [0, 0.9], [1, 0]);

  const track = (e) => {
    e.preventDefault();
    if (tn.trim()) navigate(`/track/${tn.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120]">
      <PublicNav />

      {/* ============ HERO ============ */}
      <section ref={heroRef} className="relative h-[92vh] min-h-[620px] overflow-hidden bg-[#0B1120]">
        <motion.div style={{ y: videoY }} className="absolute inset-0 h-[118%]">
          <video autoPlay loop muted playsInline poster={HERO_POSTER} className="h-full w-full object-cover opacity-40">
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
        </motion.div>
        <div className="absolute inset-0 tech-grid opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120] via-[#0B1120]/85 to-[#0B1120]/30" />
        <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-cyan-500/20 blur-[120px]" />

        <motion.div style={{ opacity: heroFade }} className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-5 lg:px-8">
          <div className="max-w-2xl">
            <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" /> Freight · Courier · Last-Mile
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
              className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-7xl">
              Move every parcel<br /><span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">with precision.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.22, ease: EASE }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              Rapid Express Logistics tracks your shipments end to end — from pickup to signed delivery — with real-time status and full visibility.
            </motion.p>

            <motion.form onSubmit={track} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.34, ease: EASE }}
              className="mt-8 flex max-w-md gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input data-testid="hero-tracking-input" value={tn} onChange={(e) => setTn(e.target.value)}
                  placeholder="Enter tracking number (e.g. RX...)" className="h-12 rounded-full border-0 bg-white pl-10 text-slate-900" />
              </div>
              <Button type="submit" data-testid="hero-track-btn" className="h-12 rounded-full bg-sky-600 px-6 hover:bg-sky-700">
                Track <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </motion.form>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-7 flex flex-wrap gap-6 text-sm text-slate-300">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-400" /> Secure delivery proof</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-cyan-400" /> Live status timeline</span>
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-cyan-400" /> Live courier map</span>
            </motion.div>
          </div>
        </motion.div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-9 w-6 items-start justify-center rounded-full border-2 border-white/30 p-1">
            <span className="h-2 w-1 rounded-full bg-white/70" />
          </motion.div>
        </div>
      </section>

      {/* ============ STATS BAND ============ */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B1120]">
        <span className="watermark pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 text-[20vw] text-slate-900/[0.03] dark:text-white/[0.03]">RX</span>
        <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 py-12 lg:grid-cols-4 lg:px-8">
          {[
            { v: 1200000, s: "+", label: "Parcels delivered" },
            { v: 99.4, s: "%", label: "On-time delivery", d: 1 },
            { v: 320, s: "+", label: "Active couriers" },
            { v: 48, s: "", label: "Cities served" },
          ].map((st, i) => (
            <Reveal key={st.label} delay={i * 0.08} className="text-center lg:text-left">
              <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                <Counter to={st.v} suffix={st.s} decimals={st.d || 0} />
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{st.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <Reveal className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-cyan-400">Why Rapid Express</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Everything a shipment needs, in one place.</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: Route, title: "End-to-end tracking", text: "Every shipment writes a status timeline — Order Created to Delivered — visible to you and your customers in real time." },
            { icon: Boxes, title: "Courier delivery flow", text: "Field couriers update status, capture photo + signature proof, and reconcile cash-on-delivery from any phone." },
            { icon: MapPin, title: "Live courier map", text: "When a parcel goes out for delivery, customers watch the courier move live on an interactive map." },
            { icon: BarChart3, title: "Operations analytics", text: "Delivery rate, revenue, and COD outstanding — a control-tower dashboard for your whole fleet." },
            { icon: Camera, title: "Proof of delivery", text: "Photo, recipient name, and a hand-signed signature captured on delivery and stored against the shipment." },
            { icon: Globe2, title: "Instant quotes", text: "Request a freight quote in seconds. Our team prices it and turns it into a live, trackable shipment." },
          ].map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08}>
              <div className="group h-full rounded-xl border border-slate-200 bg-white p-6 transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-white/10 dark:bg-[#111c30] dark:hover:shadow-cyan-500/10">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors duration-300 group-hover:bg-sky-600 group-hover:text-white dark:bg-cyan-500/10 dark:text-cyan-400 dark:group-hover:bg-cyan-500 dark:group-hover:text-[#0B1120]">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-slate-600 dark:text-slate-400">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ FLEET VIDEO ============ */}
      <section className="relative overflow-hidden bg-[#0B1120]">
        <video autoPlay loop muted playsInline poster={FLEET_POSTER} className="absolute inset-0 h-full w-full object-cover opacity-25">
          <source src={FLEET_VIDEO} type="video/mp4" />
        </video>
        <div className="absolute inset-0 tech-grid opacity-50" />
        <div className="absolute inset-0 bg-[#0B1120]/75" />
        <div className="relative mx-auto max-w-7xl px-5 py-28 lg:px-8">
          <Reveal className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Always in motion</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">A fleet that never stops moving.</h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              From long-haul freight to same-day last-mile, our network keeps parcels flowing — and every leg of the journey is logged, timestamped and visible.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => navigate("/quote")} data-testid="fleet-quote-btn" className="rounded-full bg-sky-600 px-6 hover:bg-sky-700">Request a Quote</Button>
              <Button onClick={() => navigate("/track")} variant="outline" data-testid="fleet-track-btn" className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">Track a Shipment</Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="mx-auto max-w-4xl px-5 py-24 lg:px-8">
        <Reveal className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-cyan-400">The journey</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Every shipment, five clear stages.</h2>
        </Reveal>
        <div className="relative mt-16 pl-4">
          <motion.span initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            className="absolute left-[27px] top-2 bottom-2 w-0.5 origin-top bg-gradient-to-b from-sky-500 via-orange-400 to-green-500" />
          {[
            { icon: Package, c: "#64748B", t: "Order Created", d: "Admin creates the shipment and a unique tracking number is generated instantly." },
            { icon: PackageCheck, c: "#0284C7", t: "Picked Up", d: "The assigned courier collects the parcel — the customer gets an email + in-app alert." },
            { icon: Truck, c: "#EAB308", t: "In Transit", d: "The parcel moves through the network, every hop written to the tracking timeline." },
            { icon: Search, c: "#F97316", t: "Out for Delivery", d: "On the final leg, the courier shares live GPS so the customer can watch it arrive." },
            { icon: Home, c: "#16A34A", t: "Delivered", d: "Signature + photo proof captured, COD reconciled, and a confirmation email sent." },
          ].map((s, i) => (
            <Reveal key={s.t} delay={i * 0.06} className="relative mb-9 flex gap-6 last:mb-0">
              <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-4 ring-[#F8FAFC] dark:ring-[#0B1120]" style={{ backgroundColor: s.c }}>
                <s.icon className="h-6 w-6 text-white" />
              </span>
              <div className="pt-1.5">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{s.t}</h3>
                <p className="mt-1 text-base leading-relaxed text-slate-600 dark:text-slate-400">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ LIVE TRACKING PREVIEW ============ */}
      <section className="bg-white py-24 dark:bg-[#0B1120]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-cyan-400">Live on the map</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Watch it arrive, in real time.</h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-400">
              The moment a parcel is out for delivery, the courier's phone streams its location to the tracking page. No more guessing windows — your customer sees exactly where their delivery is.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              {["Live courier position on an interactive map", "Auto-refreshing status timeline", "Photo & signature proof on delivery"].map((t) => (
                <li key={t} className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-green-600" /> {t}</li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1120] p-6 shadow-2xl ring-1 ring-cyan-500/10">
              <div className="absolute inset-0 tech-grid opacity-40" />
              <div className="relative flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-cyan-400">RX4827100394</span>
                <span className="flex items-center gap-1.5 rounded-full bg-orange-500/20 px-2.5 py-1 text-xs font-semibold text-orange-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" /> Out for Delivery
                </span>
              </div>
              <div className="relative mt-10 mb-6 h-1 rounded-full bg-white/10">
                <motion.div initial={{ width: "0%" }} whileInView={{ width: "72%" }} viewport={{ once: true }}
                  transition={{ duration: 2, ease: "easeInOut" }} className="absolute left-0 top-0 h-1 rounded-full bg-sky-500" />
                <span className="absolute left-0 h-3 w-3 rounded-full bg-sky-500 ring-4 ring-sky-500/20" style={{ top: "50%", transform: "translateY(-50%)" }} />
                <span className="absolute right-0 h-3 w-3 rounded-full bg-white/30" style={{ top: "50%", transform: "translateY(-50%)" }} />
                <motion.span initial={{ left: "0%" }} whileInView={{ left: "72%" }} viewport={{ once: true }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  className="absolute flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg"
                  style={{ top: "50%", transform: "translate(-50%,-50%)" }}>
                  <Truck className="h-4 w-4 text-sky-600" />
                </motion.span>
              </div>
              <div className="relative flex justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Warehouse</span>
                <span className="flex items-center gap-1"><Home className="h-3 w-3" /> Your door</span>
              </div>
              <div className="relative mt-6 space-y-2">
                {[{ t: "Out for delivery", a: true }, { t: "In transit — hub cleared", a: false }, { t: "Picked up", a: false }].map((r) => (
                  <div key={r.t} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
                    <span className={`h-2 w-2 rounded-full ${r.a ? "bg-orange-400 animate-pulse" : "bg-slate-500"}`} />
                    <span className={`text-sm ${r.a ? "font-medium text-white" : "text-slate-400"}`}>{r.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ CONTROL TOWER + THEME TOGGLE ============ */}
      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <div className="grid items-stretch gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-2 dark:border-white/10 dark:bg-[#111c30]">
          <div className="p-8 lg:p-12">
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-cyan-400">Operations built for scale</span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">A control tower for your entire fleet.</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                Create shipments, assign couriers and vehicles, set prices, reconcile COD, and monitor delivery performance — all from one dense, fast admin dashboard.
              </p>

              {/* Theme toggle card */}
              <div className="mt-8 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#0B1120]">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-cyan-300 dark:bg-cyan-500/10">
                    <MoonStar className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Arctic / Daylight</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Switch the theme — try it live</p>
                  </div>
                </div>
                <ThemeToggle />
              </div>

              <div className="mt-6 flex gap-3">
                <Button onClick={() => navigate("/quote")} data-testid="cta-quote" className="rounded-full bg-sky-600 hover:bg-sky-700">Request a Quote</Button>
                <Button variant="outline" onClick={() => navigate("/register")} data-testid="cta-register" className="rounded-full border-slate-300 dark:border-white/20 dark:text-white dark:hover:bg-white/10">Create Account</Button>
              </div>
            </Reveal>
          </div>
          <div className="relative min-h-[320px] overflow-hidden md:min-h-full">
            <motion.img src={CONTROL} alt="Modern automated logistics warehouse"
              initial={{ scale: 1.15 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
              transition={{ duration: 6, ease: "easeOut" }} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120]/50 to-transparent" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" /> Automated fulfilment network
            </div>
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS (name + icons, no photos) ============ */}
      <section className="bg-white py-24 dark:bg-[#0B1120]">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-cyan-400">Trusted by shippers</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Loved by operations teams and customers alike.</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Store, n: "Amara Okonkwo", r: "Ops Lead, Meridian Retail", q: "The live map alone cut our 'where is my order' tickets by half. Couriers love how simple the delivery flow is." },
              { icon: Building2, n: "David Reyes", r: "Founder, Craft & Co.", q: "We went from spreadsheets to a real control tower in a day. COD reconciliation used to be a nightmare — now it's automatic." },
              { icon: Factory, n: "Sofia Lindqvist", r: "Logistics Manager, NordParts", q: "Signature and photo proof on every delivery gave us the accountability our clients kept asking for." },
            ].map((t) => (
              <Reveal key={t.n}>
                <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-[#F8FAFC] p-6 dark:border-white/10 dark:bg-[#111c30]">
                  <Quote className="h-8 w-8 text-sky-200 dark:text-cyan-500/30" />
                  <div className="mt-3 flex gap-0.5">
                    {[...Array(5)].map((_, k) => <Star key={k} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="mt-4 flex-1 text-base leading-relaxed text-slate-700 dark:text-slate-300">"{t.q}"</p>
                  <div className="mt-5 flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-cyan-500/10 dark:text-cyan-400">
                      <t.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.n}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.r}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA (with watermark) ============ */}
      <section className="relative overflow-hidden bg-[#0B1120]">
        <div className="absolute inset-0 tech-grid opacity-50" />
        <span className="watermark pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[16vw] text-white/[0.035]">RAPID EXPRESS</span>
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-cyan-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-5 py-24 text-center lg:px-8">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">Ready to ship smarter?</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">Create a free account, request a quote, and follow every parcel from pickup to signed delivery.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate("/register")} data-testid="cta-final-register" className="h-12 rounded-full bg-sky-600 px-8 text-base hover:bg-sky-700">Get started free</Button>
              <Button onClick={() => navigate("/track")} variant="outline" data-testid="cta-final-track" className="h-12 rounded-full border-white/20 bg-white/5 px-8 text-base text-white hover:bg-white/10 hover:text-white">Track a shipment</Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B1120]">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div className="max-w-xs">
              <Logo textClass="text-slate-900 dark:text-white" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Precision logistics from first mile to last. Freight, courier and last-mile delivery, fully tracked.</p>
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><PhoneCall className="h-4 w-4 text-sky-600 dark:text-cyan-400" /> +1 (800) 555-0199</p>
            </div>
            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              {[
                { h: "Product", links: ["Track Shipment", "Get a Quote", "Live Map", "Delivery Proof"] },
                { h: "Company", links: ["About", "Careers", "Press", "Contact"] },
                { h: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
              ].map((col) => (
                <div key={col.h}>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{col.h}</p>
                  <ul className="mt-3 space-y-2">
                    {col.links.map((l) => <li key={l}><span className="cursor-pointer text-sm text-slate-600 transition-colors hover:text-sky-600 dark:text-slate-300 dark:hover:text-cyan-400">{l}</span></li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 border-t border-slate-100 pt-6 dark:border-white/10">
            <p className="text-sm text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} Rapid Express Logistics. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
