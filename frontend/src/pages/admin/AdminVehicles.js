import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import api, { apiErr } from "@/lib/api";

const blank = { label: "", type: "van", plate: "", capacity: "" };

export default function AdminVehicles() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);

  const load = () => api.get("/vehicles").then((r) => setRows(r.data)).catch(() => {});
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/vehicles", f);
      toast.success("Vehicle added");
      setOpen(false); setF(blank); load();
    } catch (err) { toast.error(apiErr(err)); }
  };

  const remove = async (id) => {
    await api.delete(`/vehicles/${id}`);
    toast.success("Vehicle removed");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vehicles</h1>
          <p className="text-sm text-slate-500">{rows.length} vehicle(s)</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="add-vehicle-btn" className="bg-sky-600 hover:bg-sky-700"><Plus className="mr-1 h-4 w-4" /> Add vehicle</Button>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-slate-50"><TableHead>Label</TableHead><TableHead>Type</TableHead><TableHead>Plate</TableHead><TableHead>Capacity</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-400">No vehicles yet.</TableCell></TableRow>
            ) : rows.map((v) => (
              <TableRow key={v.id} data-testid={`vehicle-row-${v.id}`}>
                <TableCell className="font-medium">{v.label}</TableCell>
                <TableCell className="text-sm capitalize">{v.type}</TableCell>
                <TableCell className="font-mono text-sm">{v.plate || "—"}</TableCell>
                <TableCell className="text-sm">{v.capacity || "—"}</TableCell>
                <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => remove(v.id)} data-testid={`vehicle-delete-${v.id}`}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add vehicle</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <div><Label>Label</Label><Input data-testid="vehicle-label" required value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} className="mt-1.5" /></div>
            <div>
              <Label>Type</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v })}>
                <SelectTrigger data-testid="vehicle-type" className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                  <SelectItem value="car">Car</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Plate</Label><Input data-testid="vehicle-plate" value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Capacity</Label><Input data-testid="vehicle-capacity" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} className="mt-1.5" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="vehicle-save" className="bg-sky-600 hover:bg-sky-700">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
