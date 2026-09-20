import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import ShipmentFormDialog from "@/components/ShipmentFormDialog";
import { STATUS_META } from "@/lib/status";
import api from "@/lib/api";

function payBadge(s) {
  const map = {
    paid: { t: "Paid", c: "bg-green-100 text-green-700" },
    unpaid: { t: "Unpaid", c: "bg-red-100 text-red-700" },
    cod: { t: "COD", c: "bg-orange-100 text-orange-700" },
  };
  const m = map[s] || map.unpaid;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.c}`}>{m.t}</span>;
}

export default function AdminShipments() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (status !== "all") params.status = status;
    const { data } = await api.get("/shipments", { params });
    setRows(data);
    setLoading(false);
  }, [q, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shipments</h1>
          <p className="text-sm text-slate-500">{rows.length} shipment(s)</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="create-shipment-btn" className="rounded-md bg-sky-600 hover:bg-sky-700">
          <Plus className="mr-1 h-4 w-4" /> New shipment
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input data-testid="shipment-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tracking # / name" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="shipment-status-filter" className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.keys(STATUS_META).map((k) => <SelectItem key={k} value={k}>{STATUS_META[k].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Tracking #</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Courier</TableHead>
              <TableHead>Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-400">Loading...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-400">No shipments yet. Create your first one.</TableCell></TableRow>
            ) : rows.map((s) => (
              <TableRow key={s.id} data-testid={`shipment-row-${s.tracking_number}`} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/admin/shipments/${s.id}`)}>
                <TableCell className="font-mono font-medium text-sky-700">{s.tracking_number}</TableCell>
                <TableCell>{s.recipient?.name}</TableCell>
                <TableCell className="text-sm text-slate-500">{s.sender?.city} → {s.recipient?.city}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell className="text-sm">{s.assigned_courier_name || <span className="text-slate-400">Unassigned</span>}</TableCell>
                <TableCell>{payBadge(s.payment_status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ShipmentFormDialog open={open} onOpenChange={setOpen} onSaved={load} />
    </div>
  );
}
