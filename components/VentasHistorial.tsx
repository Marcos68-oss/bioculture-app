"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Trash2, History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Venta } from "@/lib/types";

function formatFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
}

export default function VentasHistorial({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    async function cargar() {
      setLoading(true);
      const tresMesesAtras = new Date();
      tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

      const { data } = await supabase
        .from("ventas")
        .select("*")
        .gte("fecha", tresMesesAtras.toISOString())
        .order("fecha", { ascending: false });

      setVentas(data ?? []);
      setLoading(false);
    }

    cargar();
  }, [open]);

  async function handleBorrar(venta: Venta) {
    if (!confirm(`¿Eliminar la venta de "${venta.producto_nombre}" a ${venta.cliente}?\n\nOjo: esto NO devuelve el stock automáticamente.`)) {
      return;
    }
    setBorrandoId(venta.id);
    const { error } = await supabase.from("ventas").delete().eq("id", venta.id);
    setBorrandoId(null);
    if (!error) {
      setVentas((prev) => prev.filter((v) => v.id !== venta.id));
    }
  }

  if (!open) return null;

  const totalUnidades = ventas.reduce((sum, v) => sum + v.cantidad, 0);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

      <div className="safe-bottom relative z-10 flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-lg border-t border-zinc-800 bg-zinc-950 shadow-subtle">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3.5">
          <h2 className="flex items-center gap-2 text-[14px] font-medium text-zinc-100">
            <History className="h-4 w-4 text-zinc-400" />
            Historial de ventas
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:text-zinc-300"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-zinc-800 px-4 py-2.5 text-[11.5px] text-zinc-500">
          Últimos 3 meses · {ventas.length} ventas · {totalUnidades} unidades
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            </div>
          ) : ventas.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-14 text-center">
              <p className="text-[13px] text-zinc-500">Sin ventas registradas todavía</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-900 px-2 py-1">
              {ventas.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-zinc-100">
                      <span className="mr-1.5 font-mono text-[11px] text-zinc-500">
                        {v.producto_codigo}
                      </span>
                      {v.producto_nombre}
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-zinc-500">
                      {v.cliente} · {formatFecha(v.fecha)}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-[14px] font-semibold text-zinc-100">
                    ×{v.cantidad}
                  </span>
                  <button
                    onClick={() => handleBorrar(v)}
                    disabled={borrandoId === v.id}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-600 transition-colors hover:text-danger-text disabled:opacity-50"
                    aria-label="Eliminar venta"
                  >
                    {borrandoId === v.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
