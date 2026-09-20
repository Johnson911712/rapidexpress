import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import api, { apiErr } from "@/lib/api";

const blank = { name: "", email: "", phone: "", password: "" };

export default function AdminCouriers() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/admin/couriers").then((r) => setRows(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/users", { ...f, role: "courier" });
      toast.success("Courier added");
      setOpen(false); setF(blank); load();
    } catch (err) { toast.error(apiErr(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Couriers</h1>
          <p className="text-sm text-slate-500">{rows.length} courier(s)</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="add-courier-btn" className="bg-sky-600 hover:bg-sky-700"><Plus className="mr-1 h-4 w-4" /> Add courier</Button>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-slate-50"><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Active jobs</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-400">No couriers yet.</TableCell></TableRow>
            ) : rows.map((c) => (
              <TableRow key={c.id} data-testid={`courier-row-${c.email}`}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm text-slate-600">{c.email}</TableCell>
                <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                <TableCell><span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">{c.active_jobs}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add courier</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <div><Label>Name</Label><Input data-testid="courier-name" required value={f.name} onChange={set("name")} className="mt-1.5" /></div>
            <div><Label>Email</Label><Input type="email" data-testid="courier-email" required value={f.email} onChange={set("email")} className="mt-1.5" /></div>
            <div><Label>Phone</Label><Input data-testid="courier-phone" value={f.phone} onChange={set("phone")} className="mt-1.5" /></div>
            <div><Label>Password</Label><Input type="password" data-testid="courier-password" required minLength={6} value={f.password} onChange={set("password")} className="mt-1.5" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} data-testid="courier-save" className="bg-sky-600 hover:bg-sky-700">{saving ? "Saving..." : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
