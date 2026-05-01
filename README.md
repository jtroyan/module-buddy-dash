# Producción de Recursos Educativos — Seguimiento

App web para hacer seguimiento de la producción de módulos virtuales (banners, videos, rutas formativas, plan de aula, CCD, ficha tecnopedagógica) por programa académico.

---

## ✨ Funcionalidades

- **Login con email/contraseña** — sin registro público; las cuentas las crea el administrador.
- **Dashboard** con KPIs globales, avance por categoría y por programa.
- **Kanban** clasificando módulos en *Sin iniciar / En proceso / Completado*.
- **Tabla detallada** con búsqueda, filtros por categoría y edición de estado en línea.
- **Módulos comunes**: cuando un módulo aparece en varios programas, el primero queda como "principal" y los demás heredan su estado automáticamente (no se duplica trabajo).
- **Importador de Excel** desde la UI: cada hoja es un programa, cada fila un módulo, cada columna una actividad.
- **Panel de admin** para crear usuarios, importar Excel y re-detectar comunes.

---

## 🖥️ Cómo correrlo en tu PC (paso a paso)

### 1. Instalar Node.js

- Descarga e instala **Node.js 18 o superior** desde 👉 https://nodejs.org (elige la versión **LTS**).
- Verifica la instalación abriendo una terminal (CMD / PowerShell en Windows, Terminal en Mac/Linux):
  ```bash
  node --version
  npm --version
  ```
  Deben aparecer números de versión (ej. `v20.x.x`).

### 2. Descomprimir el proyecto

- Extrae el archivo ZIP en una carpeta de tu preferencia, por ejemplo:
  - Windows: `C:\Proyectos\seguimiento-produccion`
  - Mac/Linux: `~/Proyectos/seguimiento-produccion`

### 3. Abrir la terminal en esa carpeta

- **Windows**: clic derecho dentro de la carpeta → "Abrir en Terminal" (o "Abrir ventana de PowerShell aquí").
- **Mac**: clic derecho en la carpeta → "Servicios" → "Nueva Terminal en la Carpeta".
- **Linux**: clic derecho → "Abrir en terminal".

### 4. Instalar dependencias (solo la primera vez)

```bash
npm install
```

Esto descarga todas las librerías necesarias en una carpeta `node_modules`. Tarda 1-3 minutos según tu internet.

### 5. Iniciar la aplicación

```bash
npm run dev
```

Verás algo como:
```
VITE v5.x.x  ready in 800 ms
➜  Local:   http://localhost:8080/
```

### 6. Abrir en el navegador

Ve a 👉 **http://localhost:8080**

Para detener la app: en la terminal presiona `Ctrl + C`.

---

## 🔑 Primer ingreso

Ya hay una cuenta de administrador creada:

- **Email**: `jjzafra@correo.uts.edu.co`
- **Contraseña**: `Prueba2026*`

1. Abre `http://localhost:8080/auth`
2. Inicia sesión con las credenciales de arriba.
3. Una vez dentro, verás el botón **Admin** arriba a la derecha:
   - **Usuarios**: crear cuentas para tu equipo.
   - **Importar Excel**: subir un archivo para agregar más programas/módulos.
   - **Detectar comunes**: re-procesa los módulos comunes después de importar.

> 💡 **Recomendación**: cambia la contraseña tras el primer ingreso desde el panel de admin.

---

## 📊 Cómo importar más programas/módulos desde Excel

Prepara un archivo `.xlsx` con esta estructura:

- Cada **hoja** del libro = un **programa académico** (el nombre de la hoja será el nombre del programa).
- La **primera fila** de cada hoja = encabezados con los nombres de actividad (ej. `Banner principal`, `Video introductorio`, `Ruta formativa`, `Plan de aula`, `CCD`, `Ficha tecnopedagógica`).
- Cada **fila siguiente** = un módulo del programa. La primera columna debe ser el **nombre del módulo**.

Ejemplo de hoja "Ingeniería de Sistemas":

| Módulo                  | Banner | Video | Ruta | Plan de aula | CCD | Ficha |
|-------------------------|--------|-------|------|--------------|-----|-------|
| Cálculo Diferencial     |        |       |      |              |     |       |
| Programación I          |        |       |      |              |     |       |
| Bases de Datos          |        |       |      |              |     |       |

Las celdas de actividad pueden quedar vacías — la app las crea en estado "Sin iniciar".

**Pasos en la app**:
1. Inicia sesión como admin.
2. Clic en **Admin** → pestaña **Importar Excel**.
3. Selecciona tu archivo `.xlsx`.
4. Espera el mensaje de éxito. La app crea los nuevos programas/módulos sin tocar los existentes y vuelve a detectar comunes automáticamente.

---

## 🌐 Sobre la conexión a internet

Aunque la app corre en tu PC, **la base de datos está en Lovable Cloud** (servicio gestionado). Por eso necesitas conexión a internet para:
- Iniciar sesión.
- Cargar/guardar datos de programas, módulos y actividades.
- Importar Excel.

El archivo `.env` ya viene incluido con la conexión correcta. **No lo borres ni lo modifiques** — si lo cambias, la app no podrá conectar.

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

---

## 🏗️ Generar versión optimizada (opcional)

Si quieres distribuir la app compilada (más rápida):

```bash
npm run build
npm run preview
```

La carpeta `dist/` contiene los archivos estáticos listos para subir a cualquier hosting (Netlify, Vercel, IIS, Nginx, Apache).

---

## 🧰 Stack técnico

- React 18 + Vite 5
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (vía Lovable Cloud) — base de datos + autenticación
- xlsx (lectura de archivos Excel)
- TanStack Query

---

## ❓ Solución de problemas

| Problema | Solución |
|---|---|
| `npm: command not found` | No tienes Node.js. Instálalo desde https://nodejs.org |
| Puerto 8080 en uso | Cierra la otra app que lo usa o edita `vite.config.ts` (campo `port`). |
| `npm install` falla | Borra `node_modules` y `package-lock.json`, vuelve a ejecutar `npm install`. |
| No puedo iniciar sesión | Verifica conexión a internet y que el `.env` no fue modificado. |
| El Excel no se importa | Revisa que tenga al menos una hoja con encabezados en la fila 1 y datos desde la fila 2. |

---

## 📞 Soporte

Para reportar bugs o pedir cambios, contacta al administrador del proyecto.
