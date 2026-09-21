import axios from "axios";

const configuredBackendUrl = process.env.REACT_APP_BACKEND_URL?.trim();
const BACKEND_URL = configuredBackendUrl || window.location.origin;
export const API = `${BACKEND_URL.replace(/\/$/, "")}/api`;

const api = axios.create({ baseURL: API, withCredentials: true });

export function apiErr(e) {
  const d = e?.response?.data?.detail;
  if (d == null) return e?.message || "Something went wrong.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  if (d?.msg) return d.msg;
  return String(d);
}

export default api;
