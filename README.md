# Registro de gastos (Obed y Lupita)

Aplicación web para registrar gastos diarios, ver totales, gráficas y exportar a Excel. Pensada para usarse en el celular y **opcionalmente instalarse** como aplicación (PWA).

## Instalar la app en el celular (PWA) y barreras habituales

La instalación no es un APK de una tienda: es **acceso directo** a la misma web, con icono propio y pantalla casi completa. Suele tener **menos bloqueos** que instalar apps “desconocidas”, pero depende del dispositivo y del navegador.

| Situación | Qué suele pasar |
|-----------|------------------|
| **Android + Chrome** | Menú (⋮) → **Instalar aplicación** o **Agregar a la pantalla de inicio**, si la página cumple HTTPS, manifest y service worker. |
| **iPhone/iPad (Safari)** | No hay “Instalar” automático como en Android. **Compartir** → **Agregar a inicio**. Apple limita algunas funciones de PWA; para este proyecto (login, formulario, gráficas) suele bastar. |
| **Políticas MDM / celular de trabajo** | La empresa puede bloquear navegadores, sitios o perfiles; en ese caso puede fallar el acceso o la instalación. No es algo que el código pueda evitar. |
| **Navegadores poco comunes** | Firefox en Android a veces no ofrece el mismo flujo de PWA que Chrome. Recomendación: **Chrome en Android** y **Safari en iOS**. |

Requisitos técnicos que ya cubrimos en el proyecto: **HTTPS** (Render lo proporciona), **manifest web**, **service worker** (vía `vite-plugin-pwa`) y meta etiquetas para iOS.

Las **quincenas** en la app son las habituales en México: **día 1–15** y **día 16 al último día del mes** (feb 28/29, etc.), calculadas en zona **América/México_City**.

## Desarrollo local

1. Crea una base PostgreSQL local y copia `DATABASE_URL` en `backend/.env` (usa `.env.example` como guía). Define también `AUTH_OBED_PASSWORD`, `AUTH_LUPITA_PASSWORD` y `SESSION_SECRET`.
2. Backend:

```bash
cd backend
npm install
npm run dev
```

3. Frontend (otra terminal):

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. El proxy de Vite envía `/api` al backend en el puerto 4000.

### Probar (checklist rápido)

1. **PostgreSQL**: en la raíz del proyecto, con [Docker Desktop](https://www.docker.com/products/docker-desktop/) **encendido**:
   ```bash
   docker compose up -d
   ```
2. Comprueba conexión:
   ```bash
   cd backend
   npm run check-db
   ```
3. Crea tablas (idempotente):
   ```bash
   npm run init-db
   ```
4. Arranca API y UI en dos terminales. **Importante:** el frontend está en la carpeta **`registro-de-gastos\frontend`**. Si tu terminal ya está en `registro-de-gastos`, usa `cd frontend`, **no** `cd ..\frontend` (eso sube un nivel y la ruta no existe).

   Desde la **raíz del repo** (`registro-de-gastos`):

   ```bash
   # Terminal 1 — API
   cd backend
   npm run dev
   ```

   ```bash
   # Terminal 2 — interfaz (entra a la carpeta frontend de ESTE proyecto)
   cd frontend
   npm run dev
   ```

   Alternativa sin cambiar de carpeta en la terminal 2:

   ```bash
   npm run dev:frontend
   ```

   (requiere haber corrido `npm install` dentro de `frontend` al menos una vez).
5. En el navegador: `http://localhost:5173` → inicia sesión con usuario **Obed** o **Lupita** y la contraseña definida en `backend/.env` (en el ejemplo local: **amor**).
6. Añade un gasto de prueba y revisa que cambien el total y las gráficas al elegir el periodo correcto.

Si `docker compose` falla con error del *pipe* o *daemon*, Docker Desktop no está abierto: ábrelo, espera a que diga “running” y vuelve al paso 1.

## Variables de entorno

Define `AUTH_OBED_PASSWORD` y `AUTH_LUPITA_PASSWORD` en `backend/.env` (pueden ser la misma contraseña). **No subas** el archivo `.env` a GitHub.

## Despliegue en Render + GitHub

El **frontend compilado** se sirve desde el mismo servidor Node que la API (misma URL, sin CORS extra). En producción Render inyecta `RENDER_EXTERNAL_URL`; el backend lo usa para CORS y cookies si no defines `FRONTEND_URL`.

### Opción A — Blueprint (recomendado)

1. Sube el proyecto a un repositorio en **GitHub** (sin `node_modules`, sin `backend/.env`; el `.gitignore` ya lo cubre).
2. En [Render](https://dashboard.render.com): **New → Blueprint**.
3. Conecta el repo y deja que use el archivo **`render.yaml`** de la raíz.
4. Cuando te lo pida, define **`AUTH_OBED_PASSWORD`** y **`AUTH_LUPITA_PASSWORD`** (pueden ser la misma). `SESSION_SECRET` y `DATABASE_URL` se generan/vinculan solos.
5. Al terminar el deploy, abre la URL del servicio (por ejemplo `https://registro-gastos-xxxx.onrender.com`). Las tablas se crean al arrancar el servidor.

### Opción B — Web Service manual

1. **New → PostgreSQL** (plan *free* u otro) y espera a que esté disponible.
2. **New → Web Service**, conecta el mismo repo.
3. Configuración sugerida:
   - **Build command:** `npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend`
   - **Start command:** `node backend/src/index.js`
4. **Variables de entorno:**
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = *Internal Database URL* del Postgres (en el menú de la base)
   - `SESSION_SECRET` = cadena larga aleatoria
   - `AUTH_OBED_PASSWORD` / `AUTH_LUPITA_PASSWORD` = tus claves  
   (Opcional `FRONTEND_URL` = URL pública `https://tu-servicio.onrender.com` si no quieres depender solo de `RENDER_EXTERNAL_URL`.)

### Probar el build como en Render

En la raíz del repo:

```bash
npm run build
NODE_ENV=production DATABASE_URL=... SESSION_SECRET=... node backend/src/index.js
```

En Windows (PowerShell) puedes omitir `DATABASE_URL` si no tienes Postgres y solo comprobar que el servidor arranca tras el build (fallará al conectar a la BD, pero valida rutas y `dist`).

### Notas

- El plan **gratis** de Render puede **enfriar** el servicio tras inactividad; el primer acceso tarda un poco.
- Las bases **Postgres free** en Render pueden tener límites o caducidad; revisa la [documentación actual](https://render.com/docs).
