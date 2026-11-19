"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

export type OpcionSelector = { valor: string; etiqueta: string };

// Reemplaza al <select> del navegador por una lista propia del sistema.
export default function Selector({
  valor,
  opciones,
  onCambio,
  titulo,
  ariaLabel,
  className = "",
}: {
  valor: string;
  opciones: OpcionSelector[];
  onCambio: (v: string) => void;
  titulo: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const actual = opciones.find((o) => o.valor === valor);

  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={ariaLabel ?? titulo}
        aria-haspopup="listbox"
        className={`flex w-full items-center justify-between gap-2 rounded border border-zinc-800 bg-zinc-900 px-2.5 text-left text-zinc-300 outline-none transition-colors hover:border-zinc-600 focus:border-zinc-600 ${className}`}
      >
        <span className={`truncate ${actual?.valor ? "" : "text-zinc-500"}`}>
          {actual?.etiqueta ?? "Seleccionar..."}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setAbierto(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-label={titulo}
            className="safe-bottom relative z-10 flex max-h-[70dvh] w-full max-w-sm flex-col rounded-t-lg border border-zinc-800 bg-zinc-950 shadow-subtle sm:rounded-lg"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <h2 className="text-[13.5px] font-medium text-zinc-100">{titulo}</h2>
              <button
                onClick={() => setAbierto(false)}
                className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:text-zinc-300"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div role="listbox" className="flex-1 overflow-y-auto py-1">
              {opciones.map((o) => {
                const sel = o.valor === valor;
                return (
                  <button
                    key={o.valor || "__vacio"}
                    role="option"
                    aria-selected={sel}
                    onClick={() => {
                      setAbierto(false);
                      if (!sel) onCambio(o.valor);
                    }}
                    className={`flex h-11 w-full items-center justify-between gap-3 px-4 text-left text-[13.5px] transition-colors hover:bg-zinc-900 ${
                      sel ? "text-zinc-100" : "text-zinc-300"
                    }`}
                  >
                    <span className="truncate">{o.etiqueta}</span>
                    {sel && <Check className="h-4 w-4 shrink-0 text-ok-text" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
