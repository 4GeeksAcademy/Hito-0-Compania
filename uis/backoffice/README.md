# Backoffice de inventario TrackFlow

Aplicación Next.js que usa los endpoints `/inventory` del backend en `services/api`.
El contrato real utiliza `product_id`, `quantity`, `warehouse` y `notes`. El stock
de salida se consulta por producto y almacén antes del envío.

1. Configura `NEXT_PUBLIC_INVENTORY_API_URL` en `.env.local` (por defecto,
   `http://localhost:8000`). Este archivo no se sube a Git.
2. Inicia la API del proyecto y ejecuta `npm install && npm run dev` en esta carpeta.
3. Abre `http://localhost:3000/login` y utiliza una cuenta existente de la API.
   El inventario está en `/backoffice/inventory/products`.

El token se guarda en `localStorage` como `auth_token`. Las peticiones llevan
`Authorization: Bearer <token>` y un `401` elimina la sesión y redirige al login.
Los almacenes admitidos en esta interfaz son `Los Angeles` y `Zaragoza`, según el
seeder actual; el backend recibe el almacén seleccionado en cada movimiento.

Para verificar la implementación ejecuta `npm test` y `npm run build`. Los tests
usan respuestas simuladas y no modifican Supabase. Para comprobar el flujo con
datos reales se necesitan un usuario y productos existentes en la API. Si partiste
de la base vacía, el seeder de `services/api` proporciona ambos; la sesión de
prueba puede iniciarse con `admin@test.com` / `admin123` en `/login`.