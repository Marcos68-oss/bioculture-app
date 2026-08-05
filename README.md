# Yuyos Stock — Control de Inventario

PWA privada para controlar el stock de un negocio de remedios naturales.
Next.js 14 (App Router) + Tailwind + Supabase. Estética "Industrial Clean" en modo oscuro.

## 1. Crear el proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) → **New Project**.
2. Cuando esté creado, abrí **SQL Editor** y ejecutá, en este orden:
   - `supabase/schema.sql` (crea la tabla `productos` + seguridad RLS)
   - `supabase/seed.sql` (carga 5 productos de ejemplo)
3. Andá a **Authentication → Users → Add user** y creá tu usuario (email + contraseña). Es el login con el que vas a entrar a la app. No hace falta que la gente se registre sola: vos creás los usuarios manualmente desde el panel.
4. Andá a **Project Settings → API** y copiá:
   - `Project URL`
   - `anon public key`

## 2. Configurar el proyecto localmente

```bash
npm install
cp .env.local.example .env.local
```

Pegá en `.env.local` la URL y la anon key de Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

Correr en local:

```bash
npm run dev
```

Abrí `http://localhost:3000` e iniciá sesión con el usuario que creaste en el paso 1.3.

## 3. Subir a GitHub

```bash
git init
git add .
git commit -m "Sistema de control de inventario - Yuyos"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/yuyos-inventory.git
git push -u origin main
```

## 4. Desplegar en Vercel

1. Entrá a [vercel.com](https://vercel.com) → **Add New Project** → importá el repo de GitHub.
2. En **Environment Variables**, agregá las mismas dos variables de `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Click en **Deploy**. En 1-2 minutos vas a tener tu URL pública (ej: `yuyos-inventory.vercel.app`).

## 5. Instalar como app en el celular (PWA)

- **Android (Chrome)**: abrí el link de Vercel → menú (⋮) → "Instalar app" o "Agregar a pantalla de inicio".
- **iPhone (Safari)**: abrí el link → botón compartir (□↑) → "Agregar a pantalla de inicio".

Va a quedar con ícono propio y abre a pantalla completa, como una app nativa.

## Estructura del proyecto

```
app/
  page.tsx              → Login
  dashboard/page.tsx     → Dashboard (server component, carga productos)
  layout.tsx             → Layout raíz + metadata PWA
  globals.css
components/
  InventoryApp.tsx        → Orquestador: búsqueda, filtros, estado
  ProductRow.tsx           → Tarjeta densa de producto (+/- stock)
  ProductDrawer.tsx        → Modal inferior (crear/editar/eliminar)
lib/
  supabase/client.ts       → Cliente Supabase (browser)
  supabase/server.ts       → Cliente Supabase (server components)
  types.ts                 → Tipos + lógica de estado de stock
middleware.ts              → Protege /dashboard, redirige si no hay sesión
supabase/
  schema.sql               → Tabla + RLS
  seed.sql                 → 5 productos de prueba
public/
  manifest.json             → Configuración PWA
  icons/                    → Íconos de la app
```

## Notas

- El "OK / Poco stock / Agotado" se calcula automáticamente: `stock_actual <= stock_minimo` → Poco stock, `stock_actual <= 0` → Agotado.
- Los botones +/- actualizan la UI al instante (optimistic update) y confirman contra Supabase en segundo plano; si falla, se revierte solo.
- La sesión queda guardada en cookies (vía `@supabase/ssr`), así que no pide login cada vez que abrís la app desde el celular.
- Para agregar más usuarios del negocio, creálos desde **Authentication → Users** en el panel de Supabase — no hay pantalla de registro pública, por diseño (es un sistema privado).
