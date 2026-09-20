import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, PackageX, MapPin, ArrowRight } from "lucide-react";
import PublicNav from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import TrackingTimeline from "@/components/TrackingTimeline";
import LiveMap from "@/components/LiveMap";
import api, { apiErr } from "@/lib/api";

export default function TrackPage() {
  const { tn } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(tn || "");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const doTrack = async (number) => {
    if (!number) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const { data } = await api.get(`/track/${number.trim().toUpperCase()}`);
      setResult(data);
    } catch (e) {
      setError(apiErr(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (tn) doTrack(tn); }, [tn]);

  // Poll for live courier location while out for delivery
  useEffect(() => {
    if (result?.status !== "out_for_delivery") return;
    const num = result.tracking_number;
    const t = setInterval(async () => {
      try {
        const { data } = await api.get(`/track/${num}`);
        setResult(data);
      } catch (e) {
        console.error("Live tracking refresh failed:", e);
      }
    }, 12000);
    return () => clearInterval(t);
  }, [result?.status, result?.tracking_number]);

  const submit = (e) => {
    e.preventDefault();
    navigate(`/track/${input.trim().toUpperCase()}`);
    doTrack(input);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PublicNav />
      <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Track your shipment</h1>
        <p className="mt-2 text-base text-slate-600">Enter your tracking number to see the latest status.</p>

        <form onSubmit={submit} className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input data-testid="track-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="RX..." className="h-12 pl-10" />
          </div>
          <Button type="submit" data-testid="track-submit" disabled={loading} className="h-12 rounded-md bg-sky-600 px-6 hover:bg-sky-700">
            {loading ? "Searching..." : "Track"}
          </Button>
        </form>

        {error && (
          <Card data-testid="track-not-found" className="mt-8 flex flex-col items-center gap-3 p-10 text-center">
            <PackageX className="h-10 w-10 text-slate-400" />
            <p className="text-lg font-semibold text-slate-900">Shipment not found</p>
            <p className="text-sm text-slate-500">{error}</p>
          </Card>
        )}

        {result && (
          <div className="mt-8 space-y-6" data-testid="track-result">
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tracking number</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-slate-900">{result.tracking_number}</p>
                </div>
                <StatusBadge status={result.status} />
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
                <MapPin className="h-4 w-4 text-sky-600" />
                <span className="font-medium">{result.origin || "Origin"}</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
                <span className="font-medium">{result.destination || "Destination"}</span>
              </div>
            </Card>
            {result.status === "out_for_delivery" && (
              <Card className="p-6" data-testid="track-live-map">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Live delivery tracking</h2>
                {result.courier_location ? (
                  <LiveMap lat={result.courier_location.lat} lng={result.courier_location.lng} updatedAt={result.courier_location.updated_at} courierName={result.courier_name} />
                ) : (
                  <p className="text-sm text-slate-500">Your courier is out for delivery. Live location will appear here as soon as they start moving.</p>
                )}
              </Card>
            )}
            <Card className="p-6">
              <h2 className="mb-5 text-lg font-semibold text-slate-900">Shipment history</h2>
              <TrackingTimeline events={result.events} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
