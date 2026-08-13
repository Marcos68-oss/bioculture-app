"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Trash2, History, FileDown, ChevronDown, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Venta, formatGs } from "@/lib/types";
import { generarNotaVenta, generarReportePeriodo } from "@/lib/pdf";

type Periodo = "hoy" | "7d" | "30d" | "90d" | "mes_actual" | "personalizado";

const PERIODOS: { value: Periodo; label: string; dias?: number }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días", dias: 7 },
  { value: "30d", label: "Últimos 30 días", dias: 30 },
  { value: "90d", label: "Últimos 3 meses", dias: 90 },
  { value: "mes_actual", label: "Este mes" },
  { value: "personalizado", label: "Elegir día" },
];

function formatFecha(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })
  );
}

function rangoDe(periodo: Periodo, fechaDia?: string): { desde: Date; hasta: Date } {
  const ahora = new Date();

  if (periodo === "hoy") {
    const desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    const hasta = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);
    return { desde, hasta };
  }

  if (periodo === "personalizado" && fechaDia) {
    const [y, m, d] = fechaDia.split("-").map(Number);
    const desde = new Date(y, m - 1, d, 0, 0, 0, 0);
    const hasta = new Date(y, m - 1, d, 23, 59, 59, 999);
    return { desde, hasta };
  }

  if (periodo === "mes_actual") {
    const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
    return { desde, hasta: ahora };
  }

  const dias = PERIODOS.find((p) => p.value === periodo)?.dias ?? 30;
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  return { desde, hasta: ahora };
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
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [generandoReporte, setGenerandoReporte] = useState(false);

  useEffect(() => {
    if (!open) return;

    async function cargar() {
      setLoading(true);
      const tresMesesAtras = new Date();
      tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

      const { data } = await supabase
        .from("ventas")
        .select("*, venta_items(*)")
        .gte("fecha", tresMesesAtras.toISOString())
        .order("fecha", { ascending: false });

      setVentas((data as Venta[]) ?? []);
      setLoading(false);
    }

    cargar();
  }, [open]);

  const { desde, hasta } = useMemo(
    () => rangoDe(periodo, fechaSeleccionada),
    [periodo, fechaSeleccionada]
  );

  const ventasDelPeriodo = useMemo(() => {
    return ventas.filter((v) => {
      const f = new Date(v.fecha);
      return f >= desde && f <= hasta;
    });
  }, [ventas, desde, hasta]);

  const totalPeriodo = useMemo(
    () => ventasDelPeriodo.reduce((s, v) => s + v.total, 0),
    [ventasDelPeriodo]
  );

  async function handleBorrar(venta: Venta) {
    if (
      !confirm(
        `¿Eliminar la venta de "${venta.cliente}" (${formatGs(venta.total)})?\n\nOjo: esto NO devuelve el stock automáticamente.`
      )
    ) {
      return;
    }
    setBorrandoId(venta.id);
    const { error } = await supabase.from("ventas").delete().eq("id", venta.id);
    setBorrandoId(null);
    if (!error) {
      setVentas((prev) => prev.filter((v) => v.id !== venta.id));
    }
  }

  function handleExportarReporte() {
    setGenerandoReporte(true);
    let etiqueta = PERIODOS.find((p) => p.value === periodo)?.label ?? "";

    if (periodo === "hoy") {
      etiqueta = `Hoy (${desde.toLocaleDateString("es-PY")})`;
    } else if (periodo === "personalizado") {
      etiqueta = `Día ${desde.toLocaleDateString("es-PY")}`;
    }

    generarReportePeriodo(ventasDelPeriodo, desde, hasta, etiqueta);
    setGenerandoReporte(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

      <div className="safe-bottom relative z-10 flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-lg border-t border-zinc-800 bg-zinc-950 shadow-subtle">
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

        {/* Selector de período + exportar reporte */}
        <div className="space-y-2 border-b border-zinc-800 px-4 py-3">
          <div className="flex gap-1.5 overflow-x-auto">
            {PERIODOS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                  periodo === p.value
                    ? "bg-zinc-100 text-zinc-950"
                    : "border border-zinc-800 text-zinc-400"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Campo de fecha para día específico */}
          {periodo === "personalizado" && (
            <div className="flex items-center gap-2 pt-1">
              <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[12px] text-zinc-200 focus:border-zinc-600 focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11.5px] text-zinc-500">
              {ventasDelPeriodo.length} ventas · Total {formatGs(totalPeriodo)}
            </p>
            <button
              onClick={handleExportarReporte}
              disabled={ventasDelPeriodo.length === 0 || generandoReporte}
              className="flex items-center gap-1.5 rounded border border-zinc-800 px-2.5 py-1.5 text-[11.5px] font-medium text-zinc-300 transition-colors hover:border-zinc-600 disabled:opacity-40"
            >
              {generandoReporte ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <FileDown className="h-3 w-3" />
              )}
              Exportar reporte PDF
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            </div>
          ) : ventasDelPeriodo.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-14 text-center">
              <p className="text-[13px] text-zinc-500">Sin ventas en este período</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-900 px-2 py-1">
              {ventasDelPeriodo.map((v) => {
                const expandido = expandidoId === v.id;
                const cantidadItems = v.venta_items.reduce((s, it) => s + it.cantidad, 0);
                return (
                  <div key={v.id} className="px-2 py-2.5">
                    <button
                      onClick={() => setExpandidoId(expandido ? null : v.id)}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-zinc-100">
                          {v.cliente}
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px] text-zinc-500">
                          {formatFecha(v.fecha)} · {v.venta_items.length} producto(s) ·{" "}
                          {cantidadItems} unidad(es)
                        </p>
                      </div>
                      <span className="tabular shrink-0 text-[14px] font-semibold text-zinc-100">
                        {formatGs(v.total)}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-zinc-600 transition-transform ${
                          expandido ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {expandido && (
                      <div className="mt-2.5 space-y-1.5 rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
                        {v.venta_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-[12px]"
                          >
                            <span className="text-zinc-300">
                              {item.cantidad}× {item.producto_nombre}
                            </span>
                            <span className="tabular text-zinc-500">
                              {formatGs(item.subtotal)}
                            </span>
                          </div>
                        ))}
                        <div className="flex gap-2 pt-1.5">
                          <button
                            onClick={() => generarNotaVenta(v)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-zinc-800 py-1.5 text-[11.5px] font-medium text-zinc-300 transition-colors hover:border-zinc-600"
                          >
                            <FileDown className="h-3 w-3" />
                            Nota PDF
                          </button>
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
