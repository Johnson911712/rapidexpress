import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api, { apiErr } from "@/lib/api";

export default function AdminQuotes() {
  const [rows, setRows] = useState([]);
  const [active, setActive] = useState(null);
  const [price, setPrice] = useState("");

  const load = () => api.get("/quotes").then((r) => setRows(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const submitPrice = async () => {
    try {
      await api.post(`/quotes/${active.id}/price`, { quoted_price: parseFloat(price) || 0 });
      toast.success("Quote priced");
      setActive(null); setPrice("");
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const badge = (st) => {
    const m = { pending: "bg-yellow-100 text-yellow-800", quoted: "bg-sky-100 text-sky-700", converted: "bg-green-100 text-green-700" };
    return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m[st] || m.pending}`}>{st}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quote requests</h1>
        <p className="text-sm text-slate-500">{rows.length} request(s)</p>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Requester</TableHead><TableHead>Route</TableHead><TableHead>Weight</TableHead>
              <TableHead>Status</TableHead><TableHead>Quoted</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-400">No quote requests yet.</TableCell></TableRow>
            ) : rows.map((q) => (
              <TableRow key={q.id} data-testid={`quote-row-${q.id}`}>
                <TableCell><div className="font-medium text-slate-900">{q.name}</div><div className="text-xs text-slate-500">{q.email}</div></TableCell>
                <TableCell className="text-sm">{q.origin} → {q.destination}</TableCell>
                <TableCell className="text-sm">{q.weight} kg</TableCell>
                <TableCell>{badge(q.status)}</TableCell>
                <TableCell className="font-medium">{q.quoted_price != null ? `$${q.quoted_price}` : "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" data-testid={`quote-price-btn-${q.id}`} onClick={() => { setActive(q); setPrice(q.quoted_price ?? ""); }}>Set price</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Price quote</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <p className="text-slate-600">{active.name} · {active.origin} → {active.destination} · {active.weight} kg</p>
              {active.notes && <p className="rounded-md bg-slate-50 p-3 text-slate-600">{active.notes}</p>}
              <div>
                <Label>Quoted price ($)</Label>
                <Input type="number" step="0.01" data-testid="quote-price-input" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1.5" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={submitPrice} data-testid="quote-price-save" className="bg-sky-600 hover:bg-sky-700">Save quote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
