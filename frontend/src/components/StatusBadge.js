import { statusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

export default function StatusBadge({ status, className }) {
  const m = statusMeta(status);
  const Icon = m.icon;
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", m.bg, m.text, m.ring, className)}
    >
      <Icon className="h-3.5 w-3.5" />
      {m.label}
    </span>
  );
}
