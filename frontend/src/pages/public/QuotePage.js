import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import PublicNav from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import api, { apiErr } from "@/lib/api";

const empty = { name: "", email: "", phone: "", origin: "", destination: "", weight: "", dimensions: "", notes: "" };

export default function QuotePage() {
  const [form, setForm] = useState(empty);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/quotes", { ...form, weight: parseFloat(form.weight) || 0 });
      setDone(true);
    } catch (err) {
      toast.error(apiErr(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PublicNav />
      <div className="mx-auto max-w-2xl px-5 py-12 lg:px-8">
        {done ? (
          <Card data-testid="quote-success" className="flex flex-col items-center gap-3 p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <h1 className="text-2xl font-semibold text-slate-900">Quote request received</h1>
            <p className="max-w-sm text-slate-600">Our team will review your details and email you a price shortly. Thank you for choosing Rapid Express.</p>
          </Card>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Request a quote</h1>
            <p className="mt-2 text-base text-slate-600">Tell us about your shipment and we'll price it for you.</p>
            <Card className="mt-6 p-6">
              <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" data-testid="quote-name" required value={form.name} onChange={set("name")} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" data-testid="quote-email" required value={form.email} onChange={set("email")} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" data-testid="quote-phone" value={form.phone} onChange={set("phone")} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input id="weight" type="number" step="0.1" data-testid="quote-weight" value={form.weight} onChange={set("weight")} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="origin">Origin</Label>
                  <Input id="origin" data-testid="quote-origin" required value={form.origin} onChange={set("origin")} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="destination">Destination</Label>
                  <Input id="destination" data-testid="quote-destination" required value={form.destination} onChange={set("destination")} className="mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="dimensions">Dimensions (L×W×H cm)</Label>
                  <Input id="dimensions" data-testid="quote-dimensions" value={form.dimensions} onChange={set("dimensions")} className="mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" data-testid="quote-notes" value={form.notes} onChange={set("notes")} className="mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={saving} data-testid="quote-submit" className="w-full rounded-md bg-sky-600 hover:bg-sky-700">
                    {saving ? "Sending..." : "Submit request"}
                  </Button>
                </div>
              </form>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
