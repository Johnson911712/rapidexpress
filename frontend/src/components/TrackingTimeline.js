import { statusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

function fmt(d) {
  try { return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return d; }
}

export default function TrackingTimeline({ events }) {
  if (!events?.length) {
    return <p className="text-sm text-muted-foreground">No tracking updates yet.</p>;
  }
  const ordered = [...events].reverse();
  return (
    <ol className="relative" data-testid="tracking-timeline">
      {ordered.map((e, i) => {
        const m = statusMeta(e.status);
        const Icon = m.icon;
        const isLast = i === ordered.length - 1;
        const isFirst = i === 0;
        return (
          <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && <span className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200" />}
            <span
              className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white", isFirst ? "" : "opacity-90")}
              style={{ backgroundColor: m.color }}
            >
              <Icon className="h-4 w-4 text-white" />
            </span>
            <div className="pt-1">
              <p className="text-sm font-semibold text-slate-900">{m.label}</p>
              {e.location && <p className="text-sm text-slate-600">{e.location}</p>}
              {e.note && <p className="text-sm text-slate-500">{e.note}</p>}
              <p className="mt-0.5 text-xs text-slate-400 font-mono">{fmt(e.created_at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
