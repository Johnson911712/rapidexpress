import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/api";

export default function AdminCustomers() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/admin/customers").then((r) => setRows(r.data)).catch(() => {}); }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
        <p className="text-sm text-slate-500">{rows.length} customer(s)</p>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-slate-50"><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Shipments</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-400">No customers registered yet.</TableCell></TableRow>
            ) : rows.map((c) => (
              <TableRow key={c.id} data-testid={`customer-row-${c.email}`}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm text-slate-600">{c.email}</TableCell>
                <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                <TableCell><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{c.shipment_count}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
