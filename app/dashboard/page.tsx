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

  // Se lee con "*" a propósito: si todavía no existe la columna
  // inversiones_habilitado, esta consulta NO falla y ventas sigue andando.
  // Si la tabla no existe o falla la lectura, todo queda oculto por defecto.
  const { data: config } = await supabase
    .from("app_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return (
    <InventoryApp
      initialProductos={productos ?? []}
      userEmail={user.email ?? ""}
      ventasHabilitado={config?.ventas_habilitado ?? false}
      inversionesHabilitado={config?.inversiones_habilitado ?? false}
    />
  );
}
