import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import api, { apiErr } from "@/lib/api";

export default function PortalSupport() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  const load = () => api.get("/support").then((r) => { setRows(r.data); if (active) setActive(r.data.find((t) => t.id === active.id)); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/support", { subject, message });
      toast.success("Ticket submitted");
      setOpen(false); setSubject(""); setMessage(""); load();
    } catch (err) { toast.error(apiErr(err)); }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    try {
      await api.post(`/support/${active.id}/reply`, { message: reply });
      setReply(""); load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Support</h1>
        <Button onClick={() => setOpen(true)} data-testid="new-ticket-btn" className="rounded-full bg-sky-600 hover:bg-sky-700"><Plus className="mr-1 h-4 w-4" /> New ticket</Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-12 text-center text-slate-400" data-testid="support-empty">No tickets yet.</Card>
      ) : (
        <div className="space-y-3">
          {rows.map((t) => (
            <Card key={t.id} data-testid={`portal-ticket-${t.id}`} onClick={() => setActive(t)} className="cursor-pointer p-5 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{t.subject}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === "open" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{t.status}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{t.message}</p>
              <p className="mt-2 text-xs text-slate-400">{t.replies?.length || 0} replies</p>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New support ticket</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <div><Label>Subject</Label><Input data-testid="ticket-subject" required value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" /></div>
            <div><Label>Message</Label><Textarea data-testid="ticket-message" required value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1.5" rows={4} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="ticket-submit" className="bg-sky-600 hover:bg-sky-700">Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {active && (
            <>
              <DialogHeader><DialogTitle>{active.subject}</DialogTitle></DialogHeader>
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
                <div className="flex gap-2">
                  <Input data-testid="portal-reply-input" placeholder="Reply..." value={reply} onChange={(e) => setReply(e.target.value)} />
                  <Button onClick={sendReply} data-testid="portal-reply-send" className="bg-sky-600 hover:bg-sky-700">Send</Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
