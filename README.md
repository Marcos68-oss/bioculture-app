# BioCulture Stock

Control de stock (PWA privada).
Stack: Next.js 14 (App Router) + Supabase + Tailwind.

---

## Quickstart Local

1. Clonar e instalar dependencias:

    git clone https://github.com/TU-USUARIO/bioculture-inventory.git
    cd bioculture-inventory
    npm install

2. Configurar variables de entorno:
   Acomodá un .env.local tomando como base .env.local.example:

    NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui

3. Levantar la base en Supabase:
   - Correr supabase/schema.sql en el SQL Editor.
   - Correr supabase/seed.sql si querés data de prueba.
   - Creá tu usuario desde el dashboard de Supabase (Authentication > Users).

4. Correr la app:

    npm run dev

---

## Deploy (Vercel)

1. Subir a Vercel e importar el repo.
2. Cargar las mismas variables de entorno (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY).
3. Deploy.

> Nota para PWA en mobile: Entrar desde Chrome (Android) o Safari (iOS) y seleccionar "Agregar a la pantalla de inicio".

---

## Estructura

    app/                 -> Rutas de Next (login, dashboard, layout)
    components/          -> UI (InventoryApp, ProductRow, ProductDrawer)
    lib/                 -> Clientes de Supabase (browser/server) y types
    middleware.ts        -> Auth middleware (protege /dashboard)
    supabase/            -> Scripts de SQL (schema + seed)
