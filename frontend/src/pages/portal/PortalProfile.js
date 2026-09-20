import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

export default function PortalProfile() {
  const { user } = useAuth();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
      <Card className="max-w-lg p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-xl font-bold text-sky-700">{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{user?.name}</p>
            <p className="text-sm text-slate-500 capitalize">{user?.role}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4">
          <div><Label>Name</Label><Input value={user?.name || ""} readOnly className="mt-1.5 bg-slate-50" data-testid="profile-name" /></div>
          <div><Label>Email</Label><Input value={user?.email || ""} readOnly className="mt-1.5 bg-slate-50" data-testid="profile-email" /></div>
          <div><Label>Phone</Label><Input value={user?.phone || "—"} readOnly className="mt-1.5 bg-slate-50" data-testid="profile-phone" /></div>
        </div>
      </Card>
    </div>
  );
}
