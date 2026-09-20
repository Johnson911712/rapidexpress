import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackageOpen, ChevronRight, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import api from "@/lib/api";

export default function PortalShipments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/my/shipments").then((r) => setRows(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My shipments</h1>
        <Button variant="outline" onClick={() => navigate("/quote")} data-testid="portal-quote-btn" className="rounded-full">Request quote</Button>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      ) : rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center" data-testid="portal-empty">
          <PackageOpen className="h-10 w-10 text-slate-300" />
          <p className="text-slate-500">You have no shipments yet.</p>
          <p className="max-w-xs text-sm text-slate-400">Shipments linked to your email address will appear here automatically.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((s) => (
            <Card key={s.id} data-testid={`portal-shipment-${s.tracking_number}`} onClick={() => navigate(`/portal/shipments/${s.id}`)} className="cursor-pointer p-5 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-sky-700">{s.tracking_number}</span>
                <StatusBadge status={s.status} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-medium">{s.sender?.city}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">{s.recipient?.city}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
