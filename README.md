# MENIUS — Plataforma SaaS de Menús Digitales

Plataforma multi-tenant para restaurantes. Cada restaurante se registra, crea su menú, genera QRs para mesas y recibe pedidos en tiempo real.

## Stack

- **Next.js 14** (App Router, Server Components, Server Actions)
- **TypeScript** (estricto)
- **Tailwind CSS**
- **Supabase** (Postgres, Auth, RLS, Storage)
- **Zustand** (estado del carrito)
- **Zod** (validación)
- **QRCode** (generación de QRs)

## Setup Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 3. Ejecutar migración en Supabase
# Copia el contenido de supabase/migration.sql en el SQL Editor de Supabase

# 4. Iniciar desarrollo
npm run dev
```

## Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `NEXT_PUBLIC_APP_URL` | URL de la app (para QRs) |

## Rutas

### Públicas
| Ruta | Descripción |
|------|-------------|
| `/` | Landing page B2B |
| `/login` | Iniciar sesión |
| `/signup` | Registro |
| `/r/[slug]` | Menú público del restaurante |

### Protegidas (requieren auth)
| Ruta | Descripción |
|------|-------------|
| `/onboarding/create-restaurant` | Crear restaurante (primer uso) |
| `/app/orders` | Dashboard de órdenes (kanban) |
| `/app/menu/categories` | Gestión de categorías |
| `/app/menu/products` | Gestión de productos |
| `/app/tables` | Mesas y códigos QR |

## Flow del Usuario

1. Dueño se registra → `/signup`
2. Crea su restaurante → `/onboarding/create-restaurant`
3. Agrega categorías → `/app/menu/categories`
4. Agrega productos → `/app/menu/products`
5. Crea mesas y genera QRs → `/app/tables`
6. Clientes escanean QR → `/r/[slug]`
7. Clientes hacen pedidos → se ven en `/app/orders`

## Deploy en Vercel

```bash
vercel --prod
```

O push a GitHub con Vercel conectado.
