"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Usuario o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900">
            <Leaf className="h-5 w-5 text-ok-text" strokeWidth={1.75} />
          </div>
          <div className="text-center">
            <h1 className="text-[15px] font-medium text-zinc-100">Yuyos Stock</h1>
            <p className="mt-0.5 text-[13px] text-zinc-500">Control de inventario privado</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-md border border-zinc-800 bg-zinc-900/60 p-5"
        >
          <div className="space-y-3.5">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-zinc-400">
                Usuario
              </label>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@negocio.com"
                className="h-10 w-full rounded border border-zinc-800 bg-zinc-950 px-3 text-[14px] text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-zinc-400">
                Contraseña
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded border border-zinc-800 bg-zinc-950 px-3 text-[14px] text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-zinc-600"
              />
            </div>

            {error && (
              <p className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-[12.5px] text-danger-text">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded bg-zinc-100 text-[13.5px] font-medium text-zinc-950 transition-colors hover:bg-white disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </div>
        </form>

        <p className="mt-5 text-center text-[12px] text-zinc-600">
          Acceso restringido al personal autorizado
        </p>
      </div>
    </main>
  );
}
