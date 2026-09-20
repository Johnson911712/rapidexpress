import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Logo({ className, textClass, showText = true, size = "md" }) {
  const dims = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span className={cn("flex items-center gap-2.5", className)} data-testid="brand-logo">
      <span className={cn("relative flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30 ring-1 ring-white/20", dims)}>
        <span className="absolute inset-[3px] rounded-lg border border-white/25" />
        <Truck className={cn("relative text-white", icon)} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300 ring-2 ring-white dark:ring-[#0B1120]" />
      </span>
      {showText && (
        <span className={cn("text-lg font-bold tracking-tight leading-none", textClass)}>
          Rapid<span className="text-sky-500">Express</span>
          <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-400">Logistics</span>
        </span>
      )}
    </span>
  );
}
