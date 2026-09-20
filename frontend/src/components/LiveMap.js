import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function LiveMap({ lat, lng, updatedAt, courierName }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (lat == null || lng == null) return;
    if (!mapRef.current && elRef.current) {
      mapRef.current = L.map(elRef.current, { zoomControl: true, attributionControl: false })
        .setView([lat, lng], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapRef.current);
    }
    const icon = L.divIcon({
      className: "",
      html: '<div class="rx-pin"><span class="rx-pin-pulse"></span><span class="rx-pin-dot"></span></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    if (mapRef.current) {
      if (!markerRef.current) markerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current);
      else markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
      setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 200);
    }
  }, [lat, lng]);

  useEffect(() => () => {
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; }
  }, []);

  return (
    <div data-testid="live-map">
      <div ref={elRef} className="h-64 w-full rounded-md" style={{ zIndex: 0 }} />
      <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sky-500" />
        Live location of {courierName || "your courier"}
        {updatedAt ? ` · updated ${new Date(updatedAt).toLocaleTimeString()}` : ""}
      </p>
    </div>
  );
}
