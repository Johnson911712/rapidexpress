import { useEffect, useRef, useState } from "react";

export default function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0F172A";
  }, []);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {
      x: (t.clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (t.clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasInk(true);
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (onChange) onChange(canvasRef.current.toDataURL("image/png"));
  };
  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    if (onChange) onChange("");
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        data-testid="signature-pad"
        className="signature-canvas w-full h-40 rounded-md border border-slate-300 bg-white"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">{hasInk ? "Signature captured" : "Sign above"}</span>
        <button type="button" onClick={clear} data-testid="signature-clear-btn" className="text-xs font-medium text-sky-700 hover:text-sky-900">Clear</button>
      </div>
    </div>
  );
}
