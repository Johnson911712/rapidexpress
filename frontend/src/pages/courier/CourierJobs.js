import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ChevronRight, PackageOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import api from "@/lib/api";

export default function CourierJobs() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/courier/shipments").then((r) => setRows(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const active = rows.filter((s) => s.status !== "delivered");
  const done = rows.filter((s) => s.status === "delivered");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My deliveries</h1>
        <p className="text-sm text-slate-500">{active.length} active · {done.length} completed</p>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      ) : rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center" data-testid="courier-empty">
          <PackageOpen className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">No jobs assigned yet.</p>
        </Card>
      ) : (
        <>
          {active.length > 0 && <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Active</p>}
          {active.map((s) => <JobCard key={s.id} s={s} onClick={() => navigate(`/courier/jobs/${s.id}`)} />)}
          {done.length > 0 && <p className="pt-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Completed</p>}
          {done.map((s) => <JobCard key={s.id} s={s} onClick={() => navigate(`/courier/jobs/${s.id}`)} />)}
        </>
      )}
    </div>
  );
}

function JobCard({ s, onClick }) {
  return (
    <Card data-testid={`job-card-${s.tracking_number}`} onClick={onClick} className="cursor-pointer p-4 transition-transform duration-150 active:scale-[0.98]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-sky-700">{s.tracking_number}</span>
        <StatusBadge status={s.status} />
      </div>
      <p className="mt-2 font-semibold text-slate-900">{s.recipient?.name}</p>
      <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
        <MapPin className="h-3.5 w-3.5" /> {s.recipient?.address} {s.recipient?.city}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        {s.payment_method === "cod" ? (
          <span className="text-xs font-semibold text-orange-600">COD ${s.cod_amount ?? s.price ?? 0}{s.cod_collected ? " · collected" : ""}</span>
        ) : (
          <span className="text-xs font-medium text-slate-400">Prepaid</span>
        )}
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </div>
    </Card>
  );
}
