"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Producto, CategoriaProducto } from "@/lib/types";
import InversionesTab from "@/components/InversionesTab";
import ResumenTab from "@/components/ResumenTab";
import CostosTab from "@/components/CostosTab";
import CategoriasTab from "@/components/CategoriasTab";

type Tab = "inversiones" | "resumen" | "costos" | "categorias";

const TABS: { value: Tab; label: string }[] = [
  { value: "inversiones", label: "Inversiones" },
  { value: "resumen", label: "Resumen" },
  { value: "costos", label: "Costos" },
  { value: "categorias", label: "Categorías" },
];

export default function ControlPanel({
  open,
  productos,
  onClose,
  onStockCambiado,
  onProductoActualizado,
}: {
  open: boolean;
  productos: Producto[];
  onClose: () => void;
  onStockCambiado: () => void | Promise<void>;
  onProductoActualizado: (p: Producto) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("inversiones");
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);

  const cargarCategorias = useCallback(async () => {
    const { data, error } = await supabase
      .from("categorias_producto")
      .select("id, nombre")
      .order("nombre", { ascending: true });
    if (!error) setCategorias((data ?? []) as CategoriaProducto[]);
  }, [supabase]);

  useEffect(() => {
    if (open) cargarCategorias();
  }, [open, cargarCategorias]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-zinc-950">
      <header className="safe-top border-b border-zinc-800">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <h2 className="text-[14px] font-medium text-zinc-100">Control de negocio</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded border border-zinc-800 text-zinc-500 hover:text-zinc-300"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mx-auto flex w-full max-w-2xl gap-1.5 px-4 pb-3">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`h-8 flex-1 rounded px-1 text-[12px] font-medium transition-colors ${
                tab === t.value
                  ? "bg-zinc-100 text-zinc-950"
                  : "border border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-2xl">
          {tab === "inversiones" && (
            <InversionesTab
              productos={productos}
              onStockCambiado={onStockCambiado}
              onProductoCreado={onProductoActualizado}
            />
          )}
          {tab === "resumen" && <ResumenTab productos={productos} categorias={categorias} />}
          {tab === "costos" && (
            <CostosTab
              productos={productos}
              categorias={categorias}
              onProductoActualizado={onProductoActualizado}
            />
          )}
          {tab === "categorias" && (
            <CategoriasTab
              categorias={categorias}
              productos={productos}
              onCategoriasCambiaron={cargarCategorias}
              onProductosCambiaron={onStockCambiado}
            />
          )}
        </div>
      </div>
    </div>
  );
}
