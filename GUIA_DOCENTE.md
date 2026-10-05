# Guía docente de verificación — TrackFlow

Usa el flujo correspondiente al entregable que quieras revisar. La API legacy y la API de inventario son entrypoints distintos y no deben ocupar a la vez el puerto 8000. Los dos frontends Next.js usan el puerto 3000 por defecto; ejecuta uno a la vez.

## Requisitos comunes

- Python y Node.js/npm instalados; dependencias del backend en `services/api/.venv`.
- Configura `services/api/.env` con `JWT_SECRET` y `DATABASE_URL`. La URL debe apuntar a la base PostgreSQL de pruebas. Para probar recuperación de contraseña también hacen falta `RESEND_API_KEY` y `EMAIL_FROM`.
- No compartas ni subas archivos `.env`. La configuración detallada está en [services/api/README.md](services/api/README.md).
- La cuenta `admin@test.com` / `admin123` está disponible después de cargar el seed. Usa únicamente datos de prueba.

## 1. Autenticación, proveedores e incidencias

Este flujo usa la API legacy `main:app`, que incluye autenticación, usuarios, perfiles, proveedores, incidencias y las páginas estáticas del backoffice clásico.

1. Inicia la API:

   ```bash
   cd /workspaces/Hito-0-Compania/services/api
   .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. Abre `http://localhost:8000/docs` para comprobar la API. Las interfaces estáticas están en:
   - `http://localhost:8000/backoffice/` para el directorio de proveedores.
   - `http://localhost:8000/incident-manager/` para registrar, filtrar y actualizar incidencias.

3. Para probar login y gestión de cuenta, inicia el frontend Next.js en otra terminal:

   ```bash
   cd /workspaces/Hito-0-Compania/uis/talent-pipeline-tracker
   npm install
   npm run dev
   ```

   Abre `http://localhost:3000/login`. Las pantallas de recuperación de contraseña requieren la configuración de Resend indicada arriba.

## 2. Inventario — rama `Hito-5-Backoffice`

Este flujo usa `app.main:app`, que inicializa las tablas de inventario en Supabase. Si hace falta, cambia a la rama desde la raíz del proyecto:

```bash
cd /workspaces/Hito-0-Compania
git switch Hito-5-Backoffice
```

1. Inicia la API en una terminal:

   ```bash
   cd /workspaces/Hito-0-Compania/services/api
   .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. En una base de pruebas vacía, carga los datos una sola vez, desde otra terminal:

   ```bash
   cd /workspaces/Hito-0-Compania/services/api
   .venv/bin/python seed.py
   ```

   El seed crea usuarios, proveedores, productos y órdenes de prueba. Ejecútalo una sola vez en una base de pruebas vacía: al repetirlo se duplican usuarios y órdenes. `--clean` solo limpia datos locales de TinyDB; no reinicia las órdenes de Supabase y no es un reset completo.

3. Inicia el backoffice en otra terminal:

   ```bash
   cd /workspaces/Hito-0-Compania/uis/backoffice
   npm install
   npm run dev
   ```

   El script de desarrollo usa Webpack. La API se configura por defecto en `http://127.0.0.1:8000`; si usas otra dirección, define `NEXT_PUBLIC_INVENTORY_API_URL` en `uis/backoffice/.env.local` y reinicia el frontend.

4. Abre `http://localhost:3000/login` e inicia sesión con la cuenta de prueba. Recorre las pestañas en este orden:
   - **Stock:** comprobar productos, stock actual e indicadores de nivel.
   - **Nueva entrada:** registrar unidades para un producto y almacén.
   - **Nueva salida:** cambiar producto/almacén, comprobar que el stock se actualiza y probar una cantidad superior a la disponible. La advertencia debe aparecer antes del envío; el rechazo de la API debe mostrarse junto a cantidad.
   - **Historial:** verificar tipo de orden, producto, cantidad, almacén, fecha y usuario.

5. Comprueba la protección: cierra sesión y abre directamente una ruta de inventario; debe redirigir a `/login`.

## 3. Pruebas automatizadas

Desde `uis/backoffice`, ejecuta:

```bash
npm test
npm run build
```

Las pruebas de la API se describen en [TESTING.md](TESTING.md). Para el backend, el comando documentado es `uv run pytest services/api/tests/ -v` desde la raíz del proyecto.

## 4. Análisis CSV opcional

El script `scripts/analyze.py` necesita un CSV de incidencias y el archivo esperado `data/eval/incidencias_expected_metrics.json`. Esos datos no están incluidos en el repositorio actual; pide ambos archivos antes de usarlo como criterio de evaluación. Cuando estén disponibles:

```bash
python3 scripts/analyze.py RUTA_AL_CSV.csv --expected RUTA_AL_JSON.json
```