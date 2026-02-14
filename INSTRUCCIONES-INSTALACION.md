# 🚀 INSTRUCCIONES DE INSTALACIÓN - MENIUS

## ✅ PASO 1: INSTALAR GITHUB DESKTOP

1. Ve a: **https://desktop.github.com**
2. Descarga GitHub Desktop
3. Instala (siguiente → siguiente → finalizar)
4. Abre GitHub Desktop
5. **Sign in** con tu cuenta de GitHub (la que ya tienes)

---

## 📁 PASO 2: CLONAR TU REPOSITORIO

En GitHub Desktop:

1. Click en **"File"** → **"Clone repository"**
2. Busca **"menius"** en la lista
3. En "Local path", elige dónde guardar (ejemplo: C:\Users\willi\Documents)
4. Click **"Clone"**

Ahora tienes una carpeta `menius` en tu PC conectada a GitHub.

---

## 📦 PASO 3: DESCOMPRIMIR ESTE ZIP

1. Extrae ESTE archivo ZIP que descargaste
2. Verás una carpeta llamada `menius-complete`
3. Abre esa carpeta
4. Verás muchos archivos y carpetas:
   - app/
   - components/
   - lib/
   - package.json
   - etc.

---

## 🔄 PASO 4: COPIAR TODO AL REPOSITORIO

1. **Abre la carpeta donde clonaste** (la del Paso 2)
   Ejemplo: `C:\Users\willi\Documents\menius`

2. **Borra TODO lo que hay dentro** (README.md, app/, components/, todo)

3. **Copia TODO de la carpeta `menius-complete`** a la carpeta `menius`

4. **Verifica que ahora tengas:**
   ```
   C:\Users\willi\Documents\menius\
   ├── app/
   ├── components/
   ├── lib/
   ├── package.json
   ├── tsconfig.json
   └── (todos los demás archivos)
   ```

---

## ⬆️ PASO 5: SUBIR A GITHUB

1. **Abre GitHub Desktop** (si lo cerraste)

2. **Debería mostrar MUCHOS cambios** (todos los archivos nuevos)

3. En la esquina inferior izquierda:
   - Summary: `Add complete project files`
   - Description: (dejar vacío está bien)

4. Click en **"Commit to main"** (botón azul grande)

5. Click en **"Push origin"** (arriba, en el centro)

6. **Espera 10-30 segundos** mientras sube todo

7. ✅ **¡Listo! Todo está en GitHub**

---

## 🚀 PASO 6: VERIFICAR DEPLOY EN VERCEL

1. Ve a **https://vercel.com/dashboard**

2. Click en tu proyecto **"menius"**

3. Deberías ver un nuevo deployment **"Building..."**

4. **Espera 2-3 minutos**

5. Cuando diga **"Ready"**, click en **"Visit"**

6. **Deberías ver:**
   - Landing page de MENIUS (si agregamos esa página)
   - O ir a: `https://menius.vercel.app/r/taqueria-los-primos` para ver el menú demo

---

## 🎉 ¡FELICIDADES!

Tu proyecto está VIVO en internet:
- ✅ Código en GitHub
- ✅ Sitio en Vercel
- ✅ Deploy automático configurado

---

## 🔧 VARIABLES DE ENTORNO (IMPORTANTE)

**Si el sitio no funciona correctamente:**

1. Ve a **Vercel** → Tu proyecto **menius**
2. Click en **"Settings"** → **"Environment Variables"**
3. Verifica que tengas estas 2 variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Si NO las tienes, agrégalas con los valores que guardaste de Supabase.

4. Después de agregar, ve a **"Deployments"** → Click en los 3 puntos del último deployment → **"Redeploy"**

---

## ❓ ¿PROBLEMAS?

### Error: "Module not found"
→ Verifica que hayas copiado TODOS los archivos

### Error: "Supabase client error"
→ Agrega las variables de entorno en Vercel

### Página en blanco
→ Espera 2-3 minutos más, el build tarda

### Sigue sin funcionar
→ Dile a Claude: "Tengo este error: [copia el error]"

---

## 🎯 PRÓXIMOS PASOS

Una vez que funcione:

1. **Prueba el menú demo:**
   `https://menius.vercel.app/r/taqueria-los-primos`

2. **Prueba el dashboard:**
   `https://menius.vercel.app/dashboard/orders`

3. **Haz una orden de prueba:**
   - Agrega productos al carrito
   - Checkout
   - Ve la orden en el dashboard

---

**¡Todo listo!** 🚀
