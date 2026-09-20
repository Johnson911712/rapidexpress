import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Camera, Wallet, CheckCircle2, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/StatusBadge";
import SignaturePad from "@/components/SignaturePad";
import LiveMap from "@/components/LiveMap";
import { STATUS_META } from "@/lib/status";
import { toast } from "sonner";
import api, { apiErr } from "@/lib/api";

const NEXT = {
  order_created: "picked_up",
  picked_up: "in_transit",
  in_transit: "out_for_delivery",
  out_for_delivery: "delivered",
};

export default function CourierJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const fileRef = useRef(null);

  const [recipientName, setRecipientName] = useState("");
  const [photo, setPhoto] = useState("");
  const [signature, setSignature] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [codAmount, setCodAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [myLoc, setMyLoc] = useState(null);
  const [geoError, setGeoError] = useState("");
  const lastSent = useRef(0);

  const load = useCallback(async () => {
    const { data } = await api.get(`/shipments/${id}`);
    setData(data);
    setRecipientName(data.shipment.recipient?.name || "");
    setCodAmount(data.shipment.cod_amount ?? "");
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Share live GPS location while out for delivery
  const sharing = data?.shipment?.status === "out_for_delivery";
  useEffect(() => {
    if (!sharing) return;
    if (!("geolocation" in navigator)) { setGeoError("Geolocation not supported on this device."); return; }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMyLoc({ lat: latitude, lng: longitude, updated_at: new Date().toISOString() });
        setGeoError("");
        const now = Date.now();
        if (now - lastSent.current > 8000) {
          lastSent.current = now;
          api.post(`/shipments/${id}/location`, { lat: latitude, lng: longitude }).catch(() => {});
        }
      },
      (err) => setGeoError(err.message || "Unable to get location. Enable location permission."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [sharing, id]);

  if (!data) return <div className="h-64 animate-pulse rounded-lg bg-slate-100" />;
  const s = data.shipment;
  const next = NEXT[s.status];

  const updateStatus = async (status, note = "") => {
    setBusy(true);
    try {
      await api.post(`/shipments/${id}/status`, { status, location: s.recipient?.city || "", note });
      toast.success(`Status: ${STATUS_META[status].label}`);
      load();
    } catch (e) { toast.error(apiErr(e)); }
    finally { setBusy(false); }
  };

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const submitProof = async () => {
    if (!recipientName.trim()) return toast.error("Enter recipient name");
    setBusy(true);
    try {
      await api.post(`/shipments/${id}/proof`, {
        recipient_name: recipientName, photo_base64: photo, signature_base64: signature, notes: proofNotes,
      });
      await api.post(`/shipments/${id}/status`, { status: "delivered", location: s.recipient?.city || "", note: "Delivered with proof" });
      toast.success("Delivery confirmed");
      load();
    } catch (e) { toast.error(apiErr(e)); }
    finally { setBusy(false); }
  };

  const collectCod = async () => {
    setBusy(true);
    try {
      await api.post(`/shipments/${id}/cod`, { amount: parseFloat(codAmount) || 0 });
      toast.success("COD collected");
      load();
    } catch (e) { toast.error(apiErr(e)); }
    finally { setBusy(false); }
  };

  const isDelivered = s.status === "delivered";
  const atDelivery = s.status === "out_for_delivery";

  return (
    <div className="space-y-4 pb-6">
      <button onClick={() => navigate("/courier")} data-testid="courier-back" className="flex items-center gap-1 text-sm font-medium text-slate-500">
        <ArrowLeft className="h-4 w-4" /> Jobs
      </button>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-semibold text-sky-700">{s.tracking_number}</span>
          <StatusBadge status={s.status} />
        </div>
        <p className="mt-3 text-lg font-bold text-slate-900">{s.recipient?.name}</p>
        <a href={`https://maps.google.com/?q=${encodeURIComponent((s.recipient?.address || "") + " " + (s.recipient?.city || ""))}`} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1.5 text-sm text-sky-700">
          <MapPin className="h-4 w-4" /> {s.recipient?.address} {s.recipient?.city}
        </a>
        {s.recipient?.phone && (
          <a href={`tel:${s.recipient.phone}`} className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><Phone className="h-4 w-4" /> {s.recipient.phone}</a>
        )}
        {s.package?.description && <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{s.package.description} · {s.package.weight}kg</p>}
      </Card>

      {/* Status progression */}
      {!isDelivered && (
        <Card className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Update status</p>
          <div className="grid gap-2">
            {next && next !== "delivered" && (
              <Button onClick={() => updateStatus(next)} disabled={busy} data-testid="advance-status-btn" className="h-12 w-full bg-sky-600 text-base hover:bg-sky-700">
                Mark {STATUS_META[next].label}
              </Button>
            )}
            <Button onClick={() => updateStatus("attempt_failed", "Delivery attempt failed")} disabled={busy} variant="outline" data-testid="attempt-failed-btn" className="h-11 w-full border-red-200 text-red-600 hover:bg-red-50">
              Delivery attempt failed
            </Button>
          </div>
          {s.payment_method !== "cod" && s.payment_status !== "paid" && (
            <p className="mt-3 rounded-md bg-yellow-50 p-2 text-xs text-yellow-800">Awaiting payment — this shipment can't move until it's marked paid by admin.</p>
          )}
        </Card>
      )}

      {/* Live location sharing */}
      {sharing && (
        <Card className="p-4" data-testid="courier-location-card">
          <div className="mb-3 flex items-center gap-2">
            <Navigation className="h-4 w-4 text-sky-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Live location sharing</p>
          </div>
          {geoError ? (
            <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">{geoError}</p>
          ) : myLoc ? (
            <LiveMap lat={myLoc.lat} lng={myLoc.lng} updatedAt={myLoc.updated_at} courierName="you" />
          ) : (
            <p className="text-sm text-slate-500">Getting your location… allow location access to share it live with the customer.</p>
          )}
        </Card>
      )}

      {/* Delivery proof — shown when out for delivery or delivered */}
      {(atDelivery || isDelivered) && (
        <Card className="p-4" data-testid="proof-section">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Delivery proof</p>
          {isDelivered && data.proof ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-green-700"><CheckCircle2 className="h-5 w-5" /> Delivered to {data.proof.recipient_name}</div>
              {data.proof.photo_base64 && <img src={data.proof.photo_base64} alt="proof" className="h-40 w-full rounded-md object-cover" />}
              {data.proof.signature_base64 && <img src={data.proof.signature_base64} alt="signature" className="h-20 rounded-md border bg-white object-contain" />}
              {data.proof.notes && <p className="text-slate-600">{data.proof.notes}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Received by</Label>
                <Input data-testid="proof-recipient" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Photo</Label>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" data-testid="proof-photo-input" />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="mt-1.5 w-full" data-testid="proof-photo-btn">
                  <Camera className="mr-2 h-4 w-4" /> {photo ? "Photo captured — retake" : "Capture photo"}
                </Button>
                {photo && <img src={photo} alt="preview" className="mt-2 h-32 w-full rounded-md object-cover" />}
              </div>
              <div>
                <Label>Signature</Label>
                <div className="mt-1.5"><SignaturePad onChange={setSignature} /></div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea data-testid="proof-notes" value={proofNotes} onChange={(e) => setProofNotes(e.target.value)} className="mt-1.5" />
              </div>
              <Button onClick={submitProof} disabled={busy} data-testid="submit-proof-btn" className="h-12 w-full bg-green-600 text-base hover:bg-green-700">
                Confirm delivery
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* COD */}
      {s.payment_method === "cod" && (
        <Card className="p-4" data-testid="cod-section">
          <div className="mb-3 flex items-center gap-2"><Wallet className="h-4 w-4 text-orange-600" /><p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Cash on delivery</p></div>
          {s.cod_collected ? (
            <div className="flex items-center gap-2 text-sm font-medium text-green-700"><CheckCircle2 className="h-5 w-5" /> ${s.cod_collected_amount} collected</div>
          ) : (
            <div className="flex gap-2">
              <Input type="number" step="0.01" data-testid="cod-amount-input" value={codAmount} onChange={(e) => setCodAmount(e.target.value)} placeholder="Amount" />
              <Button onClick={collectCod} disabled={busy} data-testid="collect-cod-btn" className="bg-orange-600 hover:bg-orange-700">Mark collected</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
