import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, UserCheck, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import TrackingTimeline from "@/components/TrackingTimeline";
import ShipmentFormDialog from "@/components/ShipmentFormDialog";
import { FLOW, STATUS_META } from "@/lib/status";
import { toast } from "sonner";
import api, { apiErr } from "@/lib/api";

export default function AdminShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [edit, setEdit] = useState(false);

  const [courierId, setCourierId] = useState("");
  const [vehicleId, setVehicleId] = useState("none");
  const [newStatus, setNewStatus] = useState("");
  const [statusLoc, setStatusLoc] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [priceInput, setPriceInput] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get(`/shipments/${id}`);
    setData(data);
    setCourierId(data.shipment.assigned_courier_id || "");
    setVehicleId(data.shipment.vehicle_id || "none");
    setPriceInput(data.shipment.price ?? "");
  }, [id]);

  useEffect(() => {
    load();
    api.get("/admin/couriers").then((r) => setCouriers(r.data)).catch(() => {});
    api.get("/vehicles").then((r) => setVehicles(r.data)).catch(() => {});
  }, [load]);

  if (!data) return <div className="h-64 animate-pulse rounded-lg bg-slate-100" />;
  const s = data.shipment;

  const doAssign = async () => {
    if (!courierId) return toast.error("Select a courier");
    try {
      await api.post(`/shipments/${id}/assign`, { courier_id: courierId, vehicle_id: vehicleId === "none" ? null : vehicleId });
      toast.success("Courier assigned");
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const doStatus = async () => {
    if (!newStatus) return toast.error("Select a status");
    try {
      await api.post(`/shipments/${id}/status`, { status: newStatus, location: statusLoc, note: statusNote });
      toast.success("Status updated");
      setNewStatus(""); setStatusLoc(""); setStatusNote("");
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const savePrice = async () => {
    try {
      await api.post(`/shipments/${id}/payment`, { price: priceInput === "" ? null : parseFloat(priceInput) });
      toast.success("Price saved");
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const markPaid = async () => {
    try {
      await api.post(`/shipments/${id}/payment`, { mark_paid: true });
      toast.success("Marked as paid (MOCK payment)");
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const money = (n) => (n == null ? "—" : `$${Number(n).toFixed(2)}`);

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/admin/shipments")} data-testid="back-btn" className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to shipments
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-slate-900">{s.tracking_number}</h1>
            <StatusBadge status={s.status} />
          </div>
          <p className="text-sm text-slate-500">{s.sender?.city} → {s.recipient?.city}</p>
        </div>
        <Button variant="outline" onClick={() => setEdit(true)} data-testid="edit-shipment-btn"><Pencil className="mr-1 h-4 w-4" /> Edit</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Status update */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2"><RefreshCw className="h-4 w-4 text-sky-600" /><h2 className="text-lg font-semibold text-slate-900">Update status</h2></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger data-testid="status-select"><SelectValue placeholder="New status" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(STATUS_META).map((k) => <SelectItem key={k} value={k}>{STATUS_META[k].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input data-testid="status-location" placeholder="Location" value={statusLoc} onChange={(e) => setStatusLoc(e.target.value)} />
              <Input data-testid="status-note" placeholder="Note" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
            </div>
            <Button onClick={doStatus} data-testid="status-submit" className="mt-3 bg-sky-600 hover:bg-sky-700">Apply update</Button>
          </Card>

          {/* Timeline */}
          <Card className="p-6">
            <h2 className="mb-5 text-lg font-semibold text-slate-900">Tracking history</h2>
            <TrackingTimeline events={data.events} />
          </Card>

          {/* Proof */}
          {data.proof && (
            <Card className="p-6" data-testid="delivery-proof">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Delivery proof</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Received by</p>
                  <p className="mt-1 font-medium text-slate-900">{data.proof.recipient_name}</p>
                  {data.proof.notes && <p className="mt-2 text-sm text-slate-600">{data.proof.notes}</p>}
                  {data.proof.signature_base64 && (
                    <img src={data.proof.signature_base64} alt="Signature" className="mt-3 h-24 rounded-md border border-slate-200 bg-white object-contain" />
                  )}
                </div>
                {data.proof.photo_base64 && (
                  <img src={data.proof.photo_base64} alt="Delivery" className="h-40 w-full rounded-md border border-slate-200 object-cover" />
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Payment */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2"><CreditCard className="h-4 w-4 text-sky-600" /><h2 className="text-lg font-semibold text-slate-900">Billing</h2></div>
            <dl className="space-y-2 text-sm">
              <Row label="Method" value={s.payment_method === "cod" ? "Cash on delivery" : "Prepaid"} />
              <Row label="Status" value={s.payment_status?.toUpperCase()} />
              <Row label="Price" value={money(s.price)} />
              {s.payment_method === "cod" && <Row label="COD amount" value={money(s.cod_amount)} />}
              {s.payment_method === "cod" && <Row label="COD collected" value={s.cod_collected ? money(s.cod_collected_amount) : "Outstanding"} />}
            </dl>
            {s.payment_method !== "cod" && (
              <div className="mt-4 space-y-2">
                <Label>Set price</Label>
                <div className="flex gap-2">
                  <Input type="number" step="0.01" data-testid="price-input" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} />
                  <Button variant="outline" onClick={savePrice} data-testid="save-price-btn">Save</Button>
                </div>
                {s.payment_status !== "paid" && (
                  <Button onClick={markPaid} data-testid="mark-paid-btn" className="w-full bg-green-600 hover:bg-green-700">Mark as paid (MOCK)</Button>
                )}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">Online payment gateway is MOCKED for v1.</p>
          </Card>

          {/* Assign */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2"><UserCheck className="h-4 w-4 text-sky-600" /><h2 className="text-lg font-semibold text-slate-900">Assignment</h2></div>
            <div className="space-y-3">
              <div>
                <Label>Courier</Label>
                <Select value={courierId} onValueChange={setCourierId}>
                  <SelectTrigger data-testid="assign-courier-select" className="mt-1.5"><SelectValue placeholder="Select courier" /></SelectTrigger>
                  <SelectContent>
                    {couriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vehicle</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger data-testid="assign-vehicle-select" className="mt-1.5"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={doAssign} data-testid="assign-submit" className="w-full bg-sky-600 hover:bg-sky-700">Assign</Button>
              {couriers.length === 0 && <p className="text-xs text-slate-400">No couriers yet — add one under Couriers.</p>}
            </div>
          </Card>

          {/* Parties */}
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Parties</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sender</p>
                <p className="mt-1 font-medium text-slate-900">{s.sender?.name}</p>
                <p className="text-slate-600">{s.sender?.address} {s.sender?.city}</p>
                <p className="text-slate-500">{s.sender?.phone}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipient</p>
                <p className="mt-1 font-medium text-slate-900">{s.recipient?.name}</p>
                <p className="text-slate-600">{s.recipient?.address} {s.recipient?.city}</p>
                <p className="text-slate-500">{s.recipient?.phone}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ShipmentFormDialog open={edit} onOpenChange={setEdit} existing={s} onSaved={load} />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
