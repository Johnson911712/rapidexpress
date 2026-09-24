import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Truck, CheckCircle2, DollarSign, Wallet, FileText, LifeBuoy, TrendingUp, ArrowUpRight, Clock3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { statusMeta, STATUS_META } from "@/lib/status";
import api from "@/lib/api";

function Stat({ icon: Icon, label, value, tint }) {
  return (
    <Card className="p-5" data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-md ${tint}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
    </Card>
  );
}

export default function AdminDashboard() {
  const [a, setA] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/analytics"), api.get("/shipments")])
      .then(([analytics, shipmentList]) => {
        setA(analytics.data);
        setShipments(shipmentList.data.slice(0, 5));
      })
      .catch(() => setError(true));
  }, []);

  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load operations data. Please refresh and try again.</div>;
  if (!a) return <div className="h-64 animate-pulse rounded-lg bg-slate-100" />;

  const chartData = Object.keys(STATUS_META).map((k) => ({
    name: statusMeta(k).label, value: a.by_status[k] || 0, color: statusMeta(k).color,
  }));

  const money = (n) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500">Operational snapshot across your fleet.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Package} label="Total Shipments" value={a.total} tint="bg-sky-100 text-sky-700" />
        <Stat icon={CheckCircle2} label="Delivery Rate" value={`${a.delivery_rate}%`} tint="bg-green-100 text-green-700" />
        <Stat icon={DollarSign} label="Prepaid Revenue" value={money(a.revenue)} tint="bg-slate-100 text-slate-700" />
        <Stat icon={Wallet} label="COD Outstanding" value={money(a.cod_outstanding)} tint="bg-orange-100 text-orange-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-900">Shipments by status</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} />
              <Tooltip cursor={{ fill: "#F1F5F9" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((e) => <Cell key={e.name} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div className="space-y-4">
          <Stat icon={Truck} label="Couriers" value={a.couriers} tint="bg-sky-100 text-sky-700" />
          <Stat icon={Wallet} label="COD Collected" value={money(a.cod_collected)} tint="bg-green-100 text-green-700" />
          <div className="grid grid-cols-2 gap-4">
            <Stat icon={FileText} label="Pending Quotes" value={a.pending_quotes} tint="bg-yellow-100 text-yellow-700" />
            <Stat icon={LifeBuoy} label="Open Tickets" value={a.open_tickets} tint="bg-red-100 text-red-700" />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recent shipments</h2>
            <p className="text-sm text-slate-500">Latest activity from your network.</p>
          </div>
          <Link to="/admin/shipments" className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-900">View all <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <div className="divide-y divide-slate-100">
          {shipments.length === 0 ? <p className="px-6 py-8 text-sm text-slate-500">No shipments yet.</p> : shipments.map((shipment) => (
            <Link key={shipment.id} to={`/admin/shipments/${shipment.id}`} className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-slate-50">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-semibold text-sky-700">{shipment.tracking_number}</p>
                <p className="mt-1 truncate text-sm text-slate-500">{shipment.sender?.city} to {shipment.recipient?.city}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-right">
                <span className="text-xs font-medium text-slate-500">{statusMeta(shipment.status).label}</span>
                <Clock3 className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
