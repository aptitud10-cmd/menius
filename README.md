# 🍽️ MENIUS - Sistema de Pedidos para Restaurantes Sin Comisiones

Sistema completo de gestión y pedidos online para restaurantes, sin comisiones de intermediarios.

## 🚀 Stack Tecnológico

- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS + shadcn/ui
- **Base de Datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Pagos:** Stripe
- **Hosting:** Vercel

## 📋 Prerequisitos

Antes de empezar, asegúrate de tener instalado:

- **Node.js** 18+ ([Descargar](https://nodejs.org/))
- **npm** o **pnpm** (viene con Node.js)
- **Git** ([Descargar](https://git-scm.com/))
- **VS Code** (recomendado) ([Descargar](https://code.visualstudio.com/))

### Verificar instalación:
```bash
node --version  # Debe mostrar v18.0.0 o superior
npm --version   # Debe mostrar 8.0.0 o superior
git --version   # Debe mostrar 2.0.0 o superior
```

## 🛠️ Setup del Proyecto

### 1. Clonar o descargar el proyecto

Si aún no tienes el proyecto en tu computadora:

```bash
# Crea una carpeta para tu proyecto
mkdir menius
cd menius

# Copia todos los archivos que te compartí
```

### 2. Instalar dependencias

```bash
npm install
```

Este comando instalará todas las librerías necesarias (puede tomar 2-3 minutos).

### 3. Configurar Supabase

#### 3.1 Crear cuenta en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Haz clic en "Start your project"
3. Crea una cuenta (gratis)
4. Crea un nuevo proyecto:
   - Nombre: `menius`
   - Database Password: **Guárdala en un lugar seguro**
   - Región: Elige la más cercana a ti
   - Pricing: Free Plan

#### 3.2 Ejecutar el Schema de Base de Datos

1. En tu proyecto de Supabase, ve a **SQL Editor** (en el menú lateral)
2. Haz clic en **"New Query"**
3. Copia y pega TODO el contenido del archivo `supabase/schema.sql`
4. Haz clic en **"Run"** (o presiona Cmd/Ctrl + Enter)
5. Deberías ver el mensaje: "Success. No rows returned"

#### 3.3 Obtener las credenciales de Supabase

1. Ve a **Settings** > **API** (en el menú lateral)
2. Copia las siguientes credenciales:
   - **Project URL** (ejemplo: https://abcdefgh.supabase.co)
   - **anon public** key (empieza con eyJ...)
   - **service_role** key (úsala con cuidado, es secreta)

### 4. Configurar Variables de Entorno

1. Crea un archivo `.env.local` en la raíz del proyecto:

```bash
cp .env.example .env.local
```

2. Abre `.env.local` y completa con tus credenciales:

```env
# Supabase (OBLIGATORIO)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# Stripe (OPCIONAL POR AHORA - configurar después)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Los demás campos son opcionales por ahora
```

### 5. Ejecutar el proyecto

```bash
npm run dev
```

Abre tu navegador en [http://localhost:3000](http://localhost:3000)

¡Deberías ver la landing page de MENIUS! 🎉

## 📁 Estructura del Proyecto

```
menius/
├── app/                      # Rutas de la aplicación (Next.js App Router)
│   ├── page.tsx             # Landing page principal
│   ├── layout.tsx           # Layout raíz
│   ├── globals.css          # Estilos globales
│   └── (auth)/              # Rutas de autenticación (próximo)
│       ├── login/
│       └── register/
├── components/              # Componentes reutilizables
│   ├── ui/                  # Componentes base (shadcn/ui)
│   └── ...                  # Componentes personalizados
├── lib/                     # Utilidades y configuraciones
│   ├── supabase/
│   │   ├── client.ts        # Cliente de Supabase (browser)
│   │   └── server.ts        # Cliente de Supabase (server)
│   └── utils.ts             # Funciones de utilidad
├── supabase/
│   └── schema.sql           # Schema de base de datos
├── types/                   # Tipos de TypeScript
├── middleware.ts            # Middleware de Next.js (auth)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## 🔄 Git Setup (MUY IMPORTANTE)

Para prevenir que el proyecto se "rompa", vamos a usar Git desde el inicio:

### 1. Inicializar Git

```bash
git init
```

### 2. Crear repositorio en GitHub

1. Ve a [github.com](https://github.com)
2. Haz clic en **"New repository"**
3. Nombre: `menius`
4. Privado o Público (tu eliges)
5. **NO** inicialices con README ni .gitignore
6. Copia el URL del repositorio

### 3. Conectar tu proyecto local con GitHub

```bash
git remote add origin https://github.com/TU-USUARIO/menius.git
```

### 4. Hacer tu primer commit

```bash
git add .
git commit -m "Initial setup - MENIUS v0.1"
git push -u origin main
```

### 5. Commits frecuentes (IMPORTANTE)

Después de cada feature que funcione:

```bash
git add .
git commit -m "Descripción breve del cambio"
git push
```

**Regla de oro:** Hacer commit al menos 1 vez por día, o después de cada feature grande.

## 📝 Próximos Pasos

Ahora que tienes el setup básico funcionando, estos son los próximos pasos:

### ✅ Fase 1: Setup Completado
- [x] Estructura del proyecto
- [x] Base de datos configurada
- [x] Landing page básica
- [x] Git configurado

### 🔄 Fase 2: Autenticación (Próxima sesión)
- [ ] Página de login
- [ ] Página de registro
- [ ] Recuperación de contraseña
- [ ] Protección de rutas

### 🔄 Fase 3: Dashboard de Restaurante
- [ ] Layout del dashboard
- [ ] Gestión de menú (CRUD)
- [ ] Vista de órdenes en tiempo real
- [ ] Configuración del restaurante

### 🔄 Fase 4: App Cliente (Storefront)
- [ ] Página del restaurante
- [ ] Catálogo de productos
- [ ] Carrito de compras
- [ ] Checkout

### 🔄 Fase 5: Pagos & Suscripciones
- [ ] Integración con Stripe
- [ ] Planes de suscripción
- [ ] Webhooks de Stripe

## 🐛 Troubleshooting

### Problema: "Module not found"
**Solución:**
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

### Problema: "Supabase URL is required"
**Solución:** Verifica que tu archivo `.env.local` esté en la raíz del proyecto y tenga las credenciales correctas.

### Problema: Error al conectar a Supabase
**Solución:**
1. Verifica que ejecutaste el schema SQL correctamente
2. Verifica que las credenciales en `.env.local` son correctas
3. Reinicia el servidor: `Ctrl + C` luego `npm run dev`

### Problema: Puerto 3000 ya en uso
**Solución:**
```bash
# En Mac/Linux
lsof -ti:3000 | xargs kill

# O usa otro puerto
npm run dev -- -p 3001
```

## 📚 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

## 🤝 Soporte

Si tienes algún problema:

1. **Revisa este README** primero
2. **Revisa la sección de Troubleshooting**
3. **Contacta conmigo** en nuestra próxima sesión

## 📄 Licencia

Este proyecto es privado y confidencial.

---

**Creado con ❤️ para revolucionar la industria restaurantera**

Última actualización: Febrero 12, 2026
