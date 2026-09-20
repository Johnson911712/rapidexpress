import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/api";

function fmt(d) { try { return new Date(d).toLocaleString(); } catch { return d; } }

export default function AdminAudit() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/audit").then((r) => setRows(r.data)).catch(() => {}); }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-500">Recent administrative and courier actions</p>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-slate-50"><TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-400">No activity yet.</TableCell></TableRow>
            ) : rows.map((a) => (
              <TableRow key={a.id} data-testid={`audit-row-${a.id}`}>
                <TableCell className="whitespace-nowrap text-xs font-mono text-slate-500">{fmt(a.created_at)}</TableCell>
                <TableCell className="text-sm"><span className="font-medium">{a.actor_name}</span> <span className="text-xs text-slate-400">({a.actor_role})</span></TableCell>
                <TableCell><span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{a.action}</span></TableCell>
                <TableCell className="text-sm text-slate-600">{a.detail}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
