import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InventoryApp from "@/components/InventoryApp";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: productos } = await supabase
    .from("productos")
    .select("*")
    .order("codigo", { ascending: true });

  // Si la tabla app_config todavía no existe (o falla la lectura),
  // el módulo de ventas queda oculto por defecto — no rompe nada.
  const { data: config } = await supabase
    .from("app_config")
    .select("ventas_habilitado")
    .eq("id", 1)
    .maybeSingle();

  return (
    <InventoryApp
      initialProductos={productos ?? []}
      userEmail={user.email ?? ""}
      ventasHabilitado={config?.ventas_habilitado ?? false}
    />
  );
}
