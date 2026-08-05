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

  return <InventoryApp initialProductos={productos ?? []} userEmail={user.email ?? ""} />;
}
