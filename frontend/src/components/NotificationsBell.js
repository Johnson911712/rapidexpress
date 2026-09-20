import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import api from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export default function NotificationsBell({ dark }) {
  const [data, setData] = useState({ items: [], unread: 0 });
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await api.get("/notifications");
      setData(res.data);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- poll on mount

  const markAll = async () => {
    await api.post("/notifications/read-all");
    load();
  };

  const open = async (n) => {
    await api.post(`/notifications/${n.id}/read`);
    load();
    if (n.link) navigate(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button data-testid="notifications-bell" className={`relative rounded-full p-2 transition-colors ${dark ? "hover:bg-white/10 text-white" : "hover:bg-slate-100 text-slate-700"}`}>
          <Bell className="h-5 w-5" />
          {data.unread > 0 && (
            <span data-testid="notifications-count" className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {data.unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {data.unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll} data-testid="notifications-mark-all" className="h-auto p-0 text-xs text-sky-700">Mark all read</Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {data.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</p>
          ) : (
            data.items.map((n) => (
              <button key={n.id} onClick={() => open(n)} className={`block w-full border-b px-4 py-3 text-left transition-colors hover:bg-slate-50 ${!n.read ? "bg-sky-50/50" : ""}`}>
                <p className="text-sm font-medium text-slate-900">{n.title}</p>
                <p className="text-xs text-slate-500">{n.message}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
