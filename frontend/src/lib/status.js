import { Truck, PackageCheck, PackageSearch, Package, Home, AlertTriangle } from "lucide-react";

export const STATUS_META = {
  order_created: { label: "Order Created", color: "#64748B", bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-300", icon: Package },
  picked_up: { label: "Picked Up", color: "#0284C7", bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-300", icon: PackageCheck },
  in_transit: { label: "In Transit", color: "#EAB308", bg: "bg-yellow-100", text: "text-yellow-800", ring: "ring-yellow-300", icon: Truck },
  out_for_delivery: { label: "Out for Delivery", color: "#F97316", bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-300", icon: PackageSearch },
  delivered: { label: "Delivered", color: "#16A34A", bg: "bg-green-100", text: "text-green-700", ring: "ring-green-300", icon: Home },
  attempt_failed: { label: "Attempt Failed", color: "#DC2626", bg: "bg-red-100", text: "text-red-700", ring: "ring-red-300", icon: AlertTriangle },
};

export const FLOW = ["order_created", "picked_up", "in_transit", "out_for_delivery", "delivered"];

export function statusMeta(s) {
  return STATUS_META[s] || STATUS_META.order_created;
}
