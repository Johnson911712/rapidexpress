import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import api, { apiErr } from "@/lib/api";

export default function AdminSupport() {
  const [rows, setRows] = useState([]);
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState("");

  const load = () => api.get("/support").then((r) => { setRows(r.data); if (active) setActive(r.data.find((t) => t.id === active.id)); }).catch(() => {});
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendReply = async () => {
    if (!reply.trim()) return;
    try {
      await api.post(`/support/${active.id}/reply`, { message: reply });
      setReply("");
      toast.success("Reply sent");
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const close = async (id) => {
    await api.post(`/support/${id}/close`);
    toast.success("Ticket closed");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Support tickets</h1>
        <p className="text-sm text-slate-500">{rows.length} ticket(s)</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0 ? (
          <Card className="col-span-full p-10 text-center text-slate-400">No support tickets.</Card>
        ) : rows.map((t) => (
          <Card key={t.id} data-testid={`ticket-${t.id}`} className="cursor-pointer p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md" onClick={() => setActive(t)}>
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === "open" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{t.status}</span>
              <span className="text-xs text-slate-400">{t.replies?.length || 0} replies</span>
            </div>
            <h3 className="mt-2 font-semibold text-slate-900">{t.subject}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{t.message}</p>
            <p className="mt-3 text-xs text-slate-400">{t.customer_name} · {t.customer_email}</p>
          </Card>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {active && (
            <>
              <DialogHeader><DialogTitle>{active.subject}</DialogTitle></DialogHeader>
              <p className="text-xs text-slate-400">{active.customer_name} · {active.customer_email}</p>
              <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{active.message}</div>
              <div className="space-y-2">
                {active.replies?.map((r, i) => (
                  <div key={i} className={`rounded-md p-3 text-sm ${r.role === "customer" ? "bg-slate-50" : "bg-sky-50"}`}>
                    <p className="text-xs font-semibold text-slate-600">{r.author} <span className="font-normal text-slate-400">({r.role})</span></p>
                    <p className="text-slate-700">{r.message}</p>
                  </div>
                ))}
              </div>
              {active.status === "open" && (
                <div className="space-y-2">
                  <Input data-testid="reply-input" placeholder="Type a reply..." value={reply} onChange={(e) => setReply(e.target.value)} />
                  <div className="flex gap-2">
                    <Button onClick={sendReply} data-testid="reply-send" className="flex-1 bg-sky-600 hover:bg-sky-700">Send reply</Button>
                    <Button variant="outline" onClick={() => close(active.id)} data-testid="ticket-close">Close ticket</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
