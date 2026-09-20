import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import api, { apiErr } from "@/lib/api";

const blank = {
  sender: { name: "", phone: "", address: "", city: "" },
  recipient: { name: "", phone: "", address: "", city: "" },
  package: { description: "", weight: "", length: "", width: "", height: "" },
  price: "", payment_method: "prepaid", cod_amount: "", customer_email: "", notes: "",
};

export default function ShipmentFormDialog({ open, onOpenChange, existing, onSaved }) {
  const [f, setF] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setF({
        sender: { ...blank.sender, ...existing.sender },
        recipient: { ...blank.recipient, ...existing.recipient },
        package: {
          description: existing.package?.description || "",
          weight: existing.package?.weight ?? "",
          length: existing.package?.length ?? "",
          width: existing.package?.width ?? "",
          height: existing.package?.height ?? "",
        },
        price: existing.price ?? "",
        payment_method: existing.payment_method || "prepaid",
        cod_amount: existing.cod_amount ?? "",
        customer_email: existing.customer_email || "",
        notes: existing.notes || "",
      });
    } else {
      setF(blank);
    }
  }, [existing, open]);

  const party = (grp, k) => (e) => setF({ ...f, [grp]: { ...f[grp], [k]: e.target.value } });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      sender: f.sender,
      recipient: f.recipient,
      package: {
        description: f.package.description,
        weight: parseFloat(f.package.weight) || 0,
        length: parseFloat(f.package.length) || 0,
        width: parseFloat(f.package.width) || 0,
        height: parseFloat(f.package.height) || 0,
      },
      price: f.price === "" ? null : parseFloat(f.price),
      payment_method: f.payment_method,
      cod_amount: f.cod_amount === "" ? null : parseFloat(f.cod_amount),
      customer_email: f.customer_email || null,
      notes: f.notes,
    };
    try {
      if (existing) await api.put(`/shipments/${existing.id}`, payload);
      else await api.post("/shipments", payload);
      toast.success(existing ? "Shipment updated" : "Shipment created");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErr(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit shipment" : "Create shipment"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Sender</div>
            <Field label="Name" testid="ship-sender-name" value={f.sender.name} onChange={party("sender", "name")} required />
            <Field label="Phone" testid="ship-sender-phone" value={f.sender.phone} onChange={party("sender", "phone")} />
            <Field label="Address" testid="ship-sender-address" value={f.sender.address} onChange={party("sender", "address")} />
            <Field label="City" testid="ship-sender-city" value={f.sender.city} onChange={party("sender", "city")} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Recipient</div>
            <Field label="Name" testid="ship-recipient-name" value={f.recipient.name} onChange={party("recipient", "name")} required />
            <Field label="Phone" testid="ship-recipient-phone" value={f.recipient.phone} onChange={party("recipient", "phone")} />
            <Field label="Address" testid="ship-recipient-address" value={f.recipient.address} onChange={party("recipient", "address")} />
            <Field label="City" testid="ship-recipient-city" value={f.recipient.city} onChange={party("recipient", "city")} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Package</div>
            <div className="sm:col-span-4">
              <Label>Description</Label>
              <Input data-testid="ship-pkg-desc" value={f.package.description} onChange={party("package", "description")} className="mt-1.5" />
            </div>
            <Field label="Weight (kg)" testid="ship-pkg-weight" type="number" value={f.package.weight} onChange={party("package", "weight")} />
            <Field label="Length" testid="ship-pkg-length" type="number" value={f.package.length} onChange={party("package", "length")} />
            <Field label="Width" testid="ship-pkg-width" type="number" value={f.package.width} onChange={party("package", "width")} />
            <Field label="Height" testid="ship-pkg-height" type="number" value={f.package.height} onChange={party("package", "height")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Billing</div>
            <div>
              <Label>Payment method</Label>
              <Select value={f.payment_method} onValueChange={(v) => setF({ ...f, payment_method: v })}>
                <SelectTrigger data-testid="ship-payment-method" className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prepaid">Pay on creation (prepaid)</SelectItem>
                  <SelectItem value="cod">Cash on delivery (COD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {f.payment_method === "cod" ? (
              <Field label="COD amount" testid="ship-cod-amount" type="number" value={f.cod_amount} onChange={(e) => setF({ ...f, cod_amount: e.target.value })} />
            ) : (
              <Field label="Price" testid="ship-price" type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
            )}
            <div className="sm:col-span-2">
              <Label>Customer email (links to account)</Label>
              <Input data-testid="ship-customer-email" type="email" value={f.customer_email} onChange={(e) => setF({ ...f, customer_email: e.target.value })} className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea data-testid="ship-notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="mt-1.5" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} data-testid="ship-save-btn" className="bg-sky-600 hover:bg-sky-700">
              {saving ? "Saving..." : existing ? "Save changes" : "Create shipment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, testid, value, onChange, type = "text", required }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input data-testid={testid} type={type} step={type === "number" ? "0.1" : undefined} value={value} onChange={onChange} required={required} className="mt-1.5" />
    </div>
  );
}
