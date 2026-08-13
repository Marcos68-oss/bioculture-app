"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, LogOut, Wifi, ShoppingCart, History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Producto, ItemCarrito, getEstadoStock } from "@/lib/types";
import ProductRow from "@/components/ProductRow";
import ProductDrawer from "@/components/ProductDrawer";
import VentaDrawer from "@/components/VentaDrawer";
import VentasHistorial from "@/components/VentasHistorial";

export default function InventoryApp({
  initialProductos,
  userEmail,
  ventasHabilitado = false,
}: {
  initialProductos: Producto[];
  userEmail: string;
  ventasHabilitado?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();

  const [productos, setProductos] = useState<Producto[]>(initialProductos);
  const [query, setQuery] = useState("");
  const [soloAlerta, setSoloAlerta] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [ventaDrawerOpen, setVentaDrawerOpen] = useState(false);
  const [historialOpen, setHistorialOpen] = useState(false);

  const totalCount = productos.length;
  const alertaCount = useMemo(
    () => productos.filter((p) => getEstadoStock(p) !== "ok").length,
    [productos]
  );

  const productosFiltrados = useMemo(() => {
    let list = productos;
    if (soloAlerta) list = list.filter((p) => getEstadoStock(p) !== "ok");
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)
      );
    }
    return list;
  }, [productos, query, soloAlerta]);

  // Update optimista: refleja el cambio de inmediato y confirma en segundo plano
  async function ajustarStock(producto: Producto, delta: number) {
    const nuevoStock = Math.max(0, producto.stock_actual + delta);

    setProductos((prev) =>
      prev.map((p) => (p.id === producto.id ? { ...p, stock_actual: nuevoStock } : p))
    );

    const { error } = await supabase
      .from("productos")
      .update({ stock_actual: nuevoStock })
      .eq("id", producto.id);

    if (error) {
      setProductos((prev) =>
        prev.map((p) => (p.id === producto.id ? { ...p, stock_actual: producto.stock_actual } : p))
      );
    }
  }

  // Registrar una venta con uno o varios productos (carrito):
  // 1) descuenta el stock de cada producto
  // 2) crea la cabecera en `ventas`
  // 3) crea un `venta_items` por cada producto del carrito
  async function registrarVenta(items: ItemCarrito[], cliente: string): Promise<boolean> {
    const total = items.reduce((s, it) => s + it.producto.precio * it.cantidad, 0);

    // Optimistic update de stock para todos los productos del carrito
    const stockAnterior = new Map(items.map((it) => [it.producto.id, it.producto.stock_actual]));
    setProductos((prev) =>
      prev.map((p) => {
        const item = items.find((it) => it.producto.id === p.id);
        if (!item) return p;
        return { ...p, stock_actual: Math.max(0, p.stock_actual - item.cantidad) };
      })
    );

    // Descontar stock en Supabase, producto por producto
    for (const item of items) {
      const nuevoStock = Math.max(0, item.producto.stock_actual - item.cantidad);
      const { error } = await supabase
        .from("productos")
        .update({ stock_actual: nuevoStock })
        .eq("id", item.producto.id);

      if (error) {
        // Revertimos solo el stock local; puede quedar algún producto
        // anterior ya descontado en la base si falló a mitad de camino.
        setProductos((prev) =>
          prev.map((p) => {
            const anterior = stockAnterior.get(p.id);
            return anterior !== undefined ? { ...p, stock_actual: anterior } : p;
          })
        );
        return false;
      }
    }

    // Crear la venta (cabecera)
    const { data: venta, error: errorVenta } = await supabase
      .from("ventas")
      .insert({ cliente, total })
      .select()
      .single();

    if (errorVenta || !venta) return false;

    // Crear los items de esa venta
    const { error: errorItems } = await supabase.from("venta_items").insert(
      items.map((it) => ({
        venta_id: venta.id,
        producto_id: it.producto.id,
        producto_codigo: it.producto.codigo,
        producto_nombre: it.producto.nombre,
        cantidad: it.cantidad,
        precio_unitario: it.producto.precio,
        subtotal: it.producto.precio * it.cantidad,
      }))
    );

    return !errorItems;
  }

  function abrirNuevo() {
    setProductoEditar(null);
    setDrawerOpen(true);
  }

  function abrirEditar(producto: Producto) {
    setProductoEditar(producto);
    setDrawerOpen(true);
  }

  function onGuardado(producto: Producto) {
    setProductos((prev) => {
      const existe = prev.some((p) => p.id === producto.id);
      if (existe) return prev.map((p) => (p.id === producto.id ? producto : p));
      return [...prev, producto].sort((a, b) => a.codigo.localeCompare(b.codigo));
    });
    setDrawerOpen(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  }

  return (
    <main className="min-h-dvh pb-24">
      {/* Header compacto */}
      <header className="safe-top sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-[12px] font-semibold text-ok-text">
              Y
            </div>
            <div>
              <h1 className="text-[13.5px] font-medium leading-none text-zinc-100">
                BIOCULTURE
              </h1>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
                <Wifi className="h-2.5 w-2.5 text-ok-text" strokeWidth={2.5} />
                En línea
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {ventasHabilitado && (
              <button
                onClick={() => setHistorialOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded border border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
                aria-label="Historial de ventas"
                title="Historial de ventas"
              >
                <History className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded border border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
              aria-label="Cerrar sesión"
              title={userEmail}
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código o nombre..."
              className="h-9 w-full rounded border border-zinc-800 bg-zinc-900 pl-8 pr-3 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-zinc-600"
            />
          </div>
        </div>

        {/* Tabs de filtro */}
        <div className="flex gap-1.5 px-4 pb-3">
          <button
            onClick={() => setSoloAlerta(false)}
            className={`h-7 rounded px-2.5 text-[12px] font-medium transition-colors ${
              !soloAlerta
                ? "bg-zinc-100 text-zinc-950"
                : "border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            onClick={() => setSoloAlerta(true)}
            className={`h-7 rounded px-2.5 text-[12px] font-medium transition-colors ${
              soloAlerta
                ? "bg-danger text-zinc-50"
                : "border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            ⚠ Por agotarse ({alertaCount})
          </button>
        </div>
      </header>

      {/* Lista de productos */}
      <div className="divide-y divide-zinc-900 px-2">
        {productosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-16 text-center">
            <p className="text-[13px] text-zinc-500">Sin resultados</p>
            <p className="text-[12px] text-zinc-600">Prueba con otro código o nombre</p>
          </div>
        ) : (
          productosFiltrados.map((p) => (
            <ProductRow
              key={p.id}
              producto={p}
              onAjustar={(delta) => ajustarStock(p, delta)}
              onEditar={() => abrirEditar(p)}
            />
          ))
        )}
      </div>

      {/* Botones flotantes */}
      <div className="safe-bottom fixed bottom-5 right-4 z-20 flex flex-col items-end gap-2.5">
        {ventasHabilitado && (
          <button
            onClick={() => setVentaDrawerOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-ok text-zinc-950 shadow-subtle transition-transform active:scale-95"
            aria-label="Registrar venta"
            title="Registrar venta"
          >
            <ShoppingCart className="h-5 w-5" strokeWidth={2.25} />
          </button>
        )}
        <button
          onClick={abrirNuevo}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-100 text-zinc-950 shadow-subtle transition-transform active:scale-95"
          aria-label="Agregar producto"
        >
          <Plus className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </div>

      <ProductDrawer
        open={drawerOpen}
        producto={productoEditar}
        onClose={() => setDrawerOpen(false)}
        onGuardado={onGuardado}
      />

      {ventasHabilitado && (
        <>
          <VentaDrawer
            open={ventaDrawerOpen}
            productos={productos}
            onClose={() => setVentaDrawerOpen(false)}
            onConfirmar={registrarVenta}
          />
          <VentasHistorial open={historialOpen} onClose={() => setHistorialOpen(false)} />
        </>
      )}
    </main>
  );
}
