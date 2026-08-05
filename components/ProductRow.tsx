"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Producto, getEstadoStock } from "@/lib/types";

const ESTADO_CONFIG = {
  ok: { label: "OK", cls: "bg-ok-bg text-ok-text border-ok-border" },
  poco: { label: "Poco stock", cls: "bg-warn-bg text-warn-text border-warn-border" },
  agotado: { label: "Agotado", cls: "bg-danger-bg text-danger-text border-danger-border" },
};

export default function ProductRow({
  producto,
  onAjustar,
  onEditar,
}: {
  producto: Producto;
  onAjustar: (delta: number) => void;
  onEditar: () => void;
}) {
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const estado = getEstadoStock(producto);
  const config = ESTADO_CONFIG[estado];

  function handle(delta: number) {
    onAjustar(delta);
    setFlash(delta > 0 ? "good" : "bad");
    window.setTimeout(() => setFlash(null), 480);
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-md px-2.5 py-2.5 transition-colors ${
        flash === "good" ? "animate-flash-good" : flash === "bad" ? "animate-flash-bad" : ""
      }`}
    >
      {/* Código */}
      <span className="w-9 shrink-0 font-mono text-[12px] tracking-tight text-zinc-500">
        {producto.codigo}
      </span>

      {/* Nombre + badge */}
      <button
        onClick={onEditar}
        className="min-w-0 flex-1 text-left"
        aria-label={`Editar ${producto.nombre}`}
      >
        <p className="truncate text-[13.5px] font-medium text-zinc-100">{producto.nombre}</p>
        <span
          className={`mt-1 inline-flex items-center rounded border px-1.5 py-0.5 text-[10.5px] font-medium leading-none ${config.cls}`}
        >
          {config.label}
        </span>
      </button>

      {/* Contador */}
      <span className="tabular w-7 shrink-0 text-right text-[17px] font-semibold text-zinc-100">
        {producto.stock_actual}
      </span>

      {/* Controles +/- */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => handle(-1)}
          disabled={producto.stock_actual <= 0}
          className="flex h-9 w-9 items-center justify-center rounded border border-zinc-800 text-zinc-400 transition-all active:scale-90 active:bg-zinc-900 disabled:opacity-30"
          aria-label="Restar stock"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
        <button
          onClick={() => handle(1)}
          className="flex h-9 w-9 items-center justify-center rounded border border-zinc-800 text-zinc-100 transition-all active:scale-90 active:bg-zinc-900"
          aria-label="Sumar stock"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
