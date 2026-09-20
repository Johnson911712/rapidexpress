import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ThemeToggle({ className }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-9 w-[68px] shrink-0 items-center rounded-full border transition-colors duration-300",
        dark ? "border-white/10 bg-slate-800" : "border-slate-200 bg-slate-100",
        className
      )}
    >
      <span
        className={cn(
          "absolute flex h-7 w-7 items-center justify-center rounded-full shadow-md transition-transform duration-300",
          dark ? "translate-x-[37px] bg-[#0B1120] text-cyan-300" : "translate-x-1 bg-white text-amber-500"
        )}
      >
        {mounted && (dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />)}
      </span>
    </button>
  );
}
