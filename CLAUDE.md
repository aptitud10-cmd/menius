# MENIUS — Project Context for AI Agents

## What is Menius?
A SaaS platform for restaurants in Latin America. Restaurant owners get a digital menu at `menius.app/[slug]` where customers browse and place orders. The platform includes POS, KDS, delivery tracking, loyalty, CRM, AI image generation, and more.

## Tech Stack
- **Framework**: Next.js 14 App Router (TypeScript strict)
- **Database**: Supabase (Postgres + Auth + Storage + Realtime)
- **Payments**: Stripe (subscriptions) + Stripe Connect (restaurant payouts)
- **Email**: Resend
- **AI**: Gemini (image gen, chat, menu import) + fal.ai (Flux Pro image gen)
- **State**: Zustand (cart, favorites)
- **Styling**: Tailwind CSS + shadcn/ui patterns
- **Animations**: framer-motion
- **Error tracking**: Sentry
- **Analytics**: PostHog
- **Rate limiting**: Upstash Redis (fallback: in-memory)
- **Deployment**: Vercel (auto-deploy on push to main)
- **Repo**: github.com/aptitud10-cmd/menius (branch: main)

## Directory Structure
```
src/
  app/
    [slug]/          # Public menu page (SSG + ISR, revalidate 300s)
      page.tsx       # Server component — fetches data, passes slim products to MenuShell
      menu-data.ts   # fetchMenuData() — cached with unstable_cache 1h
      loading.tsx    # Skeleton UI
    app/             # Restaurant owner dashboard (requires auth)
    admin/           # Super-admin panel (requires ADMIN_EMAIL env var)
    api/             # Route handlers (server-side only)
      admin/         # Admin-only endpoints
      ai/            # AI features (image gen, chat, menu import)
      billing/       # Stripe subscriptions
      orders/        # Order placement + management
      tenant/        # Per-restaurant CRUD
    kds/             # Kitchen Display System
    counter/         # Counter/cashier view
  components/
    public/          # Customer-facing components (MenuShell, ProductCard, etc.)
    menu/            # Restaurant dashboard menu management
    dashboard/       # Restaurant dashboard general components
    ui/              # Shared UI primitives
  lib/
    supabase/
      browser.ts     # createBrowserClient()
      server.ts      # createServerClient() — for server components/routes
      admin.ts       # createAdminClient() — service role, bypasses RLS
    auth/
      get-tenant.ts  # getTenant() — returns { userId, restaurantId } or null
      check-plan.ts  # hasPlanAccess(), getEffectivePlanId()
    store-overrides.ts  # Per-store UI feature flags (slug → config)
    store-config-context.tsx  # React context for store overrides
  store/
    cartStore.ts     # Zustand cart (persisted)
    favoritesStore.ts
  types/
    index.ts         # All TypeScript interfaces
```

## Key Patterns

### Authentication
- **Customer (public)**: No auth — menus are fully public
- **Restaurant owner**: Supabase Auth → `getTenant()` returns `{ userId, restaurantId }`
- **Admin (super)**: Email check against `ADMIN_EMAIL` env var in `src/app/admin/layout.tsx`

### Database Access
- Always use `createAdminClient()` in API routes that need to bypass RLS
- Use `createClient()` (user-scoped) for data that belongs to the current user
- Never use the service role key in client components

### Server vs Client Components
- `app/[slug]/page.tsx` is a **server component** — can use async/await, no hooks
- `MenuShell.tsx` is a **client component** (`'use client'`) — receives props from server
- API routes: always `export const dynamic = 'force-dynamic'` for POST routes

### Product Data Flow
- Server fetches full products (with modifier_groups) in `menu-data.ts`
- `page.tsx` slims products before passing to MenuShell: `modifier_groups:[]`, adds `has_modifiers: boolean`
- `CustomizationSheet` lazy-fetches full modifier data via `GET /api/product-modifiers?productId=xxx`
- This reduces the RSC payload for large catalogs (Buccaneer: 250 products)

### Per-Store Overrides
- `src/lib/store-overrides.ts` — add slug → config to activate features per store
- Currently: `buccaneer: { optimizeImages: true }`
- Large catalog mode auto-activates when `products > 80 || categories > 12`
- Context available anywhere via `useStoreConfig()` hook

### Image Uploads
- All images go through Sharp: resize to 1200×1200, convert to WebP quality 82
- Upload route: `POST /api/tenant/upload`
- AI-generated images: also optimized with Sharp before upload
- Supabase Storage bucket: `product-images`

### Caching Strategy
- Public menu pages: ISR with `revalidate: 300` (5 min)
- Menu data: `unstable_cache` 1h per restaurant, tagged `menu-data:${slug}`
- Invalidated via `revalidateTag()` when restaurant edits menu
- Static generation: `generateStaticParams()` pre-builds all restaurant pages

## Environment Variables (key ones)
```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY         # Admin client (server-only)
STRIPE_SECRET_KEY                 # Stripe payments
RESEND_API_KEY                    # Email sending
GEMINI_API_KEY                    # AI features
FAL_API_KEY                       # Flux Pro image generation
ANTHROPIC_API_KEY                 # Claude AI (admin dev tool)
GITHUB_TOKEN                      # GitHub API (admin dev tool)
VERCEL_TOKEN                      # Vercel API (admin dev tool)
VERCEL_PROJECT_ID                 # Vercel project ID
VOYAGE_API_KEY                    # Code embeddings + reranking
TAVILY_API_KEY                    # Web search
ADMIN_EMAIL                       # Super-admin email
CRON_SECRET                       # Bearer token for cron jobs
```

## Database Schema (key tables)
- `restaurants` — slug, name, owner_user_id, locale, currency, cover_image_url, ui_flags JSONB
- `categories` — restaurant_id, name, sort_order, is_active, available_from/to
- `products` — restaurant_id, category_id, name, price, image_url, is_featured, in_stock, modifier_groups (joined)
- `modifier_groups` — product_id, name, selection_type, is_required, min_select, max_select
- `modifier_options` — group_id, name, price_delta, is_default
- `orders` — restaurant_id, status, total, order_type, customer_name, items (JSON)
- `order_items` — order_id, product_id, qty, unit_price
- `subscriptions` — restaurant_id, status, plan_id, trial_end, current_period_end
- `profiles` — user_id, full_name, role (super_admin | owner | staff)

## Coding Conventions
- TypeScript strict mode — no `any` unless absolutely necessary
- All public API functions must validate arguments
- Error handling: throw for exceptional cases, return null for expected missing data
- No `Date.now()` in Supabase queries (breaks caching)
- Use indexes instead of `.filter()` for DB queries
- Keep route handlers thin — business logic in separate TS functions
- No inline comments that just describe what the code does
- Imports always at top of file — no inline imports
- Prefer editing existing files over creating new ones

## Important Files to Know
- `src/components/public/MenuShell.tsx` — 2200+ line main menu component
- `src/app/api/orders/route.ts` — order placement with FK validation
- `src/app/[slug]/menu-data.ts` — menu data fetching with caching
- `src/lib/store-overrides.ts` — per-store feature flags
- `src/app/api/product-modifiers/route.ts` — lazy modifier loading
- `supabase/migration.sql` — base schema
- `next.config.js` — image domains, CSP headers, ISR config

## Current Active Stores (real clients)
- `buccaneer` — large catalog (250+ products, 26 categories) — large catalog mode active
- `shelara-bloom` — new client, checkout bug was fixed
- `hot-dogs-perrones` — new client
- `el-sabor` — new client
- `comedor-gardenia` — new client

## Admin Dev Tool Architecture
- Located at: `/admin/dev`
- Codebase indexed in Supabase `code_embeddings` table (pgvector)
- Embeddings: Voyage AI `voyage-code-3` model
- Reranking: Voyage AI `rerank-2` model
- Main AI: Claude (model selectable by user)
- Code access: GitHub API via GITHUB_TOKEN
- Apply changes: GitHub commit → Vercel auto-deploys
- Web search: Tavily API
