# Producción de Recursos Educativos — Seguimiento

App web para hacer seguimiento de la producción de módulos virtuales (banners, videos, rutas formativas, plan de aula, CCD, ficha tecnopedagógica) por programa académico.

## Funcionalidades

- **Login con email/contraseña** (las cuentas las crea el administrador).
- **Dashboard** con KPIs globales, avance por categoría y por programa.
- **Kanban** clasificando módulos en *Sin iniciar / En proceso / Completado*.
- **Tabla detallada** con búsqueda, filtros por categoría y edición de estado en línea.
- **Módulos comunes**: cuando un módulo aparece en varios programas, el primero queda como "principal" y los demás heredan su estado automáticamente (no se duplica trabajo).
- **Importador de Excel** desde la UI: cada hoja es un programa, cada fila un módulo, cada columna una actividad.
- **Panel de admin** para crear usuarios, importar Excel y re-detectar comunes.

---

## Requisitos para correr local

- **Node.js 18+** ([descargar aquí](https://nodejs.org))
- Conexión a internet (la base de datos vive en Lovable Cloud)

## Cómo correrlo

1. **Descomprime el ZIP** en una carpeta.
2. Abre una terminal en esa carpeta.
3. Instala dependencias:
   ```bash
   npm install
   ```
4. Inicia la app:
   ```bash
   npm run dev
   ```
5. Abre en el navegador: **http://localhost:8080**

### Para generar build de producción

```bash
npm run build
npm run preview
```

---

## Variables de entorno

El archivo `.env` ya viene incluido con la conexión a la base de datos del proyecto. **No lo borres ni lo modifiques** — si lo cambias, la app no podrá conectar.

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

---

## Primer uso

1. Pídele al admin que te cree una cuenta (Panel Admin → Usuarios).
2. Inicia sesión en `/auth`.
3. Si eres admin, verás el botón **Admin** arriba a la derecha:
   - **Usuarios**: crear cuentas para tu equipo.
   - **Importar**: subir un Excel para agregar más programas/módulos.
   - **Comunes**: re-detectar módulos comunes después de importar.

## Cómo importar más programas

1. Prepara un Excel donde:
   - Cada **hoja** es un programa académico (el nombre de la hoja será el nombre del programa).
   - La primera fila son los **encabezados** de las columnas (nombres de actividad: "Banner principal", "Video introductorio", etc.).
   - Cada fila siguiente es un **módulo** del programa.
2. En la app: Admin → Importar → selecciona el archivo.
3. La app crea programas/módulos/actividades nuevos sin tocar los existentes y vuelve a detectar comunes automáticamente.

## Soporte

Stack: React 18 + Vite + Tailwind + shadcn/ui + Lovable Cloud (Supabase managed).
