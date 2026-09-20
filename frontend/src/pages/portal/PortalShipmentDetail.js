import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import TrackingTimeline from "@/components/TrackingTimeline";
import LiveMap from "@/components/LiveMap";
import { toast } from "sonner";
import api, { apiErr } from "@/lib/api";

export default function PortalShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  const load = () => api.get(`/shipments/${id}`).then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (data?.shipment?.status !== "out_for_delivery") return;
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [data?.shipment?.status, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div className="h-64 animate-pulse rounded-lg bg-slate-100" />;
  const s = data.shipment;
  const money = (n) => (n == null ? "—" : `$${Number(n).toFixed(2)}`);

  const payNow = async () => {
    try {
      await api.post(`/shipments/${id}/payment`, { mark_paid: true });
      toast.success("Payment successful (MOCK)");
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  return (
    <div className="space-y-5">
      <button onClick={() => navigate("/portal")} data-testid="portal-back" className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> My shipments
      </button>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tracking number</p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900">{s.tracking_number}</p>
          </div>
          <StatusBadge status={s.status} />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3 text-sm">
          <div><p className="text-xs uppercase tracking-wide text-slate-500">From</p><p className="mt-1 font-medium text-slate-900">{s.sender?.city}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-slate-500">To</p><p className="mt-1 font-medium text-slate-900">{s.recipient?.city}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-slate-500">Payment</p><p className="mt-1 font-medium text-slate-900">{s.payment_status?.toUpperCase()} · {money(s.payment_method === "cod" ? s.cod_amount : s.price)}</p></div>
        </div>
        {s.payment_method !== "cod" && s.payment_status !== "paid" && s.price != null && (
          <Button onClick={payNow} data-testid="portal-pay-btn" className="mt-5 bg-sky-600 hover:bg-sky-700">Pay {money(s.price)} now (MOCK)</Button>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">Tracking history</h2>
        <TrackingTimeline events={data.events} />
      </Card>

      {s.status === "out_for_delivery" && (
        <Card className="p-6" data-testid="portal-live-map">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Live delivery tracking</h2>
          {s.courier_location ? (
            <LiveMap lat={s.courier_location.lat} lng={s.courier_location.lng} updatedAt={s.courier_location.updated_at} courierName={s.assigned_courier_name} />
          ) : (
            <p className="text-sm text-slate-500">Your courier is out for delivery. Live location will appear here shortly.</p>
          )}
        </Card>
      )}

      {data.proof && (
        <Card className="p-6" data-testid="portal-proof">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900"><CheckCircle2 className="h-5 w-5 text-green-600" /> Delivered</h2>
          <p className="text-sm text-slate-600">Received by <span className="font-medium text-slate-900">{data.proof.recipient_name}</span></p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.proof.photo_base64 && <img src={data.proof.photo_base64} alt="Delivery" className="h-40 w-full rounded-md border object-cover" />}
            {data.proof.signature_base64 && <img src={data.proof.signature_base64} alt="Signature" className="h-24 rounded-md border bg-white object-contain" />}
          </div>
        </Card>
      )}
    </div>
  );
}
