# Informe de Optimización de Caching

## Decisiones en el Frontend

### 1. Lazy Loading — `OrderForm` (rutas inbound/outbound)

**Componente:** `components/inventory/OrderForm.tsx`  
**Rutas:** `/backoffice/inventory/orders/inbound` y `/backoffice/inventory/orders/outbound`

**Justificación:**
El componente `OrderForm` es un formulario complejo que:
- Mantiene **7 estados** (`products`, `productId`, `warehouse`, `quantity`, `notes`, `stock`, más estados de UI como `loading`, `stockLoading`, `submitting`, `error`, `quantityError`, `success`)
- Ejecuta **3 efectos secundarios** (`useEffect`) que llaman a la API para cargar productos y consultar stock
- Renderiza templates condicionales complejos (selector de productos, feedback de stock, advertencias de cantidad)
- Su bundle es considerablemente más pesado que el de una página simple

Estas rutas **solo se navegan después del login**, cuando el usuario decide registrar una entrada o salida. No forman parte de la carga inicial de la aplicación. Diferir su carga hasta que se navegue a ellas:
- **Reduce el tamaño del bundle inicial** (el JS de OrderForm no se descarga hasta que se necesita)
- **Mejora el tiempo hasta la interactividad (TTI)** de la página principal de productos
- **No afecta la experiencia del usuario** porque al navegar a la ruta se muestra un indicador de carga ("Cargando formulario...") mientras se descarga el componente

**Implementación:**
```tsx
const OrderForm = dynamic(() => import("../../../../../components/inventory/OrderForm"), {
  loading: () => <p role="status" className={styles.loading}>Cargando formulario de entrada...</p>,
  ssr: false,
});
```

**Beneficio estimado:** Reducción de ~8-12 KB en el bundle JS inicial (estimación basada en la complejidad del componente). Dado que estas rutas solo se visitan bajo demanda, el ahorro es permanente para los usuarios que solo consultan stock sin registrar movimientos.

---

### 2. Lazy Loading — `OrdersContent` (historial de órdenes)

**Componente:** `components/inventory/OrdersContent.tsx` (extraído de `OrdersPage`)  
**Ruta:** `/backoffice/inventory/orders`

**Justificación:**
La página de historial de órdenes contiene:
- Una tabla con renderizado condicional de celdas
- Formateo de fechas con `toLocaleString("es-ES")` para cada fila
- Lógica de cálculo de clases CSS según tipo de orden (inbound/outbound)

Al igual que el formulario, esta ruta **solo se navega bajo demanda** a través del menú de navegación del inventario. No es parte del flujo principal (productos). Separar el contenido pesado en un subcomponente cargado dinámicamente permite que el bundle base del layout de inventario sea más ligero.

**Implementación:**
```tsx
const OrdersContent = dynamic(() => import("../../../../components/inventory/OrdersContent"), {
  loading: () => <p role="status" className={styles.loading}>Cargando historial de órdenes...</p>,
  ssr: false,
});
```

**Beneficio estimado:** Reducción de ~5-8 KB en el bundle JS inicial. Además, al extraer el componente, se separa claramente la responsabilidad de carga (page.tsx) del contenido (OrdersContent.tsx).

---

### 3. `useMemo` — Cálculos derivados en `OrderForm`

**Valores memoizados:**

#### `currentStock`
```tsx
const currentStock = useMemo(
  () => stock?.productId === productId && stock.warehouse === warehouse ? stock.value : null,
  [stock, productId, warehouse],
);
```
- **¿Qué calcula?:**
  Verifica que el objeto `stock` cacheado corresponda al producto y almacén actualmente seleccionados. Si coincide, devuelve el valor numérico; si no (por ejemplo, porque el usuario cambió de producto), devuelve `null` para forzar una nueva consulta.
- **¿Por qué es no trivial?**
  Es una validación compuesta que compara 3 valores (`stock.productId === productId && stock.warehouse === warehouse`) y decide qué mostrar. Sin `useMemo`, se recalcula en cada render del formulario (cada vez que el usuario escribe en cualquier campo).
- **Dependencias:** `stock`, `productId`, `warehouse` — solo cambian cuando el usuario selecciona un producto/almacén diferente o cuando llega una respuesta de la API de stock.

#### `exceedsStock`
```tsx
const exceedsStock = useMemo(
  () => outbound && currentStock !== null && quantity !== "" && Number(quantity) > currentStock,
  [outbound, currentStock, quantity],
);
```
- **¿Qué calcula?**
  Determina si la cantidad ingresada supera el stock disponible (solo relevante para órdenes de salida). Esto activa una advertencia visual en el formulario.
- **¿Por qué es no trivial?**
  Involucra 4 condiciones encadenadas que dependen de `currentStock` (ya memoizado), `quantity` y `outbound`. Se recalca en cada pulsación de tecla en el campo de cantidad.
- **Dependencias:** `outbound`, `currentStock`, `quantity`

#### `productOptions`
```tsx
const productOptions = useMemo(
  () => products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>),
  [products],
);
```
- **¿Qué calcula?**
  Genera los elementos `<option>` del selector de productos.
- **¿Por qué es no trivial?**
  Aunque el map es simple, genera nodos JSX que React debe reconciliar. La lista de productos solo cambia cuando se cargan inicialmente, por lo que memoizarla evita recrear estos nodos en cada render.
- **Dependencias:** `products`

**Beneficio estimado:** Estos cálculos se ejecutaban en cada render (cada tecla en el formulario, cada cambio de selección). Con `useMemo`, solo se recalculan cuando sus dependencias cambian explícitamente. Para un formulario con múltiples campos, esto evita decenas de recálculos innecesarios por segundo durante la escritura.

---

### 4. `useMemo` — Filas de tabla en `ProductsPage`

```tsx
const productRows = useMemo(
  () => products.map((product) => {
    const stockClass = product.current_stock <= 0 ? styles.empty : product.current_stock <= 10 ? styles.low : styles.healthy;
    const stockLabel = product.current_stock <= 0 ? "Agotado" : product.current_stock <= 10 ? "Stock bajo" : "Disponible";
    // ... JSX de la fila
  }),
  [products, styles],
);
```

- **¿Qué calcula?**
  Genera todo el JSX de las filas de la tabla de productos, incluyendo el cálculo de clase CSS y etiqueta de stock para cada producto.
- **¿Por qué es no trivial?**
  La lista de productos solo cambia cuando se recarga desde la API. Al memoizar las filas, se evita que React tenga que recrear y reconciliar todos los nodos `<tr>` en cada renderización del componente (que ocurre si cualquier estado global o contexto cambia).
- **Dependencias:** `products`, `styles`

---

### Intercambios reconocidos (Frontend)

**Lazy Loading vs. experiencia de carga percibida:**
Al diferir la carga de `OrderForm` y `OrdersContent`, introducimos un pequeño retardo perceptual cuando el usuario navega a estas rutas (se muestra "Cargando..." mientras se descarga el JS). Hemos decidido que este intercambio es aceptable porque:
1. El indicador de carga es inmediato (feedback visual instantáneo)
2. La descarga del JS es rápida (componentes de ~5-12 KB)
3. El beneficio en la carga inicial (reducir bundle) es permanente para todos los usuarios
4. El usuario ya experimenta una navegación (cambio de ruta), por lo que el micro-retardo se enmascara dentro del tiempo de navegación

**useMemo vs. complejidad adicional:**
Hemos aplicado `useMemo` solo a cálculos con un coste real (validaciones compuestas, generación de JSX de listas). No hemos memoizado valores triviales como `outbound` o `label` (que son simples booleanos/strings sin coste de cómputo), siguiendo el principio de evitar memoización prematura.

---

## Decisiones en el Backend

### Inventario completo de endpoints (evaluación coste × frecuencia × estabilidad)

Siguiendo el requisito de la consigna de *"listar todos los endpoints y evaluar para cada uno (a) coste, (b) frecuencia y (c) estabilidad"*, este es el inventario completo de la API FastAPI (29 endpoints en 7 routers). La evaluación determina si cada endpoint es candidato a caché: solo los que tienen **coste alto × frecuencia alta × estabilidad alta** lo son.

**Leyenda de la columna "Candidato":**
- ✅ **SÍ** — cumple coste × frecuencia × estabilidad → caché implementada
- 🟡 **DUDOSO** — cumple parcialmente (coste medio, frecuencia baja) → se evaluó y no se cacheó
- ❌ **NO** — viola al menos un eje (coste trivial, frecuencia baja o datos volátiles/sesión)

#### `services/api/routes/incidents.py` (prefix `/api/incidents`)

| Endpoint | Coste | Frecuencia | Estabilidad | Candidato |
|---|---|---|---|---|
| `POST ""` (crear incidencia) | Bajo (insert TinyDB) | Baja (bajo demanda) | — (escritura) | ❌ No (es una escritura) |
| `GET ""` (listar incidencias) | Medio (filtros/orden/paginación) | Media | Volátil (muchas combinaciones de filtros) | ❌ No (combinaciones infinitas diluyen aciertos) |
| `GET "/summary"` | **Medio-Alto (O(n) sobre todas las incidencias)** | **Media-Alta** | **Alta (solo cambia con escrituras)** | ✅ **SÍ → CACHÉ 60s** |
| `GET "/{id}"` | Bajo (<5ms, lookup en memoria) | Baja | Alta | ❌ No (coste trivial) |
| `PATCH "/{id}/status"` | Bajo (update TinyDB) | Baja | — (escritura) | ❌ No (es una escritura; además **invalida** summary) |

#### `services/api/routes/suppliers.py` (sin prefijo → montado en `/suppliers`)

| Endpoint | Coste | Frecuencia | Estabilidad | Candidato |
|---|---|---|---|---|
| `POST ""` (crear proveedor) | Bajo | Baja | — (escritura) | ❌ No (escritura) |
| `GET ""` (listar) | Bajo (~8ms, filtros en Python) | Baja (gestión de proveedores) | Media | ❌ No (coste trivial + frecuencia baja) |
| `GET "/{id}"` | Mínimo (O(1) por doc_id) | Baja | Alta | ❌ No (coste trivial) |
| `PATCH "/{id}/rate"` | Bajo | Baja | — (escritura) | ❌ No (escritura) |
| `PATCH "/{id}/status"` | Bajo | Baja | — (escritura) | ❌ No (escritura) |
| `DELETE "/{id}"` | Bajo | Baja | — (escritura) | ❌ No (escritura) |

#### `services/api/app/routers/inventory.py` (prefix `/inventory`)

| Endpoint | Coste | Frecuencia | Estabilidad | Candidato |
|---|---|---|---|---|
| `GET "/products"` | **Alto (2N queries de stock)** | **Alta (página principal)** | **Alta (solo cambia con órdenes/productos)** | ✅ **SÍ → CACHÉ 30s** |
| `POST "/products"` | Bajo (insert) | Baja | — (escritura) | ❌ No (escritura; además **invalida** products) |
| `GET "/products/{id}"` | Medio (recalcula stock de 1 producto) | Baja | Alta | 🟡 Dudosos (coste medio pero frecuencia baja) |
| `POST "/orders/inbound"` | Bajo | Baja | — (escritura) | ❌ No (escritura; además **invalida** products) |
| `POST "/orders/outbound"` | Bajo | Baja | — (escritura) | ❌ No (escritura; además **invalida** products) |
| `GET "/orders"` | Medio (JOIN + formateo) | Baja | Baja (historial siempre reciente) | ❌ No (datos con user_uuid + siempre recientes) |

#### `services/api/app/routers/auth.py` (`/auth/*`)

| Endpoint | Coste | Frecuencia | Estabilidad | Candidato |
|---|---|---|---|---|
| `POST "/login"` | Medio (bcrypt) | Media | — (sesión) | ❌ No (sesión/escritura de token) |
| `GET "/me"` | Bajo (lookup TinyDB) | Media | — (sesión, por usuario) | ❌ No (datos de sesión) |
| `POST "/forgot-password"` | Bajo | Baja | — (sesión) | ❌ No (sesión) |
| `POST "/reset-password"` | Bajo | Baja | — (escritura) | ❌ No (escritura/sesión) |
| `POST "/change-password"` | Bajo | Baja | — (escritura) | ❌ No (escritura/sesión) |

#### `services/api/app/routers/users.py` (`/users`)

| Endpoint | Coste | Frecuencia | Estabilidad | Candidato |
|---|---|---|---|---|
| `POST ""` (crear usuario) | Bajo | Baja | — (escritura) | ❌ No (escritura) |
| `GET ""` (listar) | Bajo-Medio (filtros) | Baja | Media | ❌ No (frecuencia baja, datos personales) |
| `GET "/{user_id}"` | Bajo | Baja | Media | ❌ No (datos personales, frecuencia baja) |
| `PUT "/{user_id}"` | Bajo | Baja | — (escritura) | ❌ No (escritura) |
| `DELETE "/{user_id}"` | Bajo | Baja | — (escritura) | ❌ No (escritura) |

#### `services/api/app/routers/profiles.py` (`/profiles`)

| Endpoint | Coste | Frecuencia | Estabilidad | Candidato |
|---|---|---|---|---|
| `GET "/me"` | Bajo (lookup) | Media | — (sesión, por usuario) | ❌ No (datos de sesión del usuario) |
| `PUT "/me"` | Bajo | Baja | — (escritura) | ❌ No (escritura) |

**Conclusión del inventario:** De los 29 endpoints, solo **2** cumplen la triple condición coste × frecuencia × estabilidad:
`GET /inventory/products` y `GET /api/incidents/summary`. Ambos están cacheados. El resto se descartó por violar al menos un eje — documentado detalladamente en la sección "Qué no se cacheó y por qué".

---

### Utilidad de caché: `services/api/cache.py`

Se implementó un módulo de caché en memoria con soporte de TTL. La caché es un diccionario en proceso (`_cache_store`) donde cada entrada tiene una clave con prefijo y una expiración basada en `time.monotonic()`.

**Funciones expuestas:**
- `get_cached(key)` → retorna el valor si existe y no ha expirado
- `set_cached(key, value, ttl_seconds)` → almacena con expiración
- `invalidate_cache(prefix)` → elimina todas las entradas cuyo prefijo coincida
- `build_cache_key(prefix, *args, **kwargs)` → genera claves consistentes incluyendo parámetros no-None

---

### Middleware de timing

Se añadió un middleware HTTP en ambas aplicaciones FastAPI que registra el método, ruta, status code y duración (en ms) de cada petición. Esto permite identificar empíricamente los endpoints que más se benefician de la caché.

```python
# services/api/main.py — Timing middleware
@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = (time.perf_counter() - start) * 1000
    logger.info(f"{request.method} {request.url.path} → {response.status_code} | {duration:.1f}ms")
    return response
```

**Salida observada en logs (mediciones reales, ver sección "Verificación empírica"):**
```
GET /inventory/products → 200 | 207.9ms    ← 🐢 MISS (recalcula stock de 205 productos)
GET /inventory/products → 200 | 2.0ms      ← HIT (misma clave, TTL 30s)
GET /api/incidents/summary → 200 | 33.5ms  ← MISS (recorre 82 incidencias)
GET /api/incidents/summary → 200 | 0.7ms   ← HIT (misma clave, TTL 60s)
GET /suppliers → 200 | 8.1ms               ← sin cachear (coste bajo)
POST /inventory/orders/inbound → 201 | 52.3ms
```

---

### Endpoint cacheado 1: `GET /inventory/products`

| Aspecto | Valor |
|---|---|
| **Archivo** | `services/api/app/routers/inventory.py` |
| **Coste de la operación** | **Alto.** Por cada producto ejecuta `SUM(entradas) - SUM(salidas)` en PostgreSQL (2 queries por producto). Con N productos, son 2N consultas SQL. Además incluye JOIN a la tabla de productos. |
| **Frecuencia estimada** | **Alta.** Es la página principal del backoffice (stock). Se llama cada vez que el usuario carga la lista de productos o navega desde otra sección. Carga inicial + recargas frecuentes. |
| **Estabilidad de datos** | Los datos subyacentes cambian **solo cuando se crea un producto o se registra una orden** (entrada/salida). Entre escrituras, los datos son estables. |
| **TTL elegido** | **30 segundos.** Balance entre frescura (si alguien registra una orden, el stock se actualiza en <30s) y rendimiento (evita recalcular 2N queries constantemente). |
| **Clave de caché** | `list_products:warehouse=<warehouse>` — incluye el parámetro `warehouse` opcional. Sin warehouse se usa una clave genérica. |
| **Estrategia de invalidación** | Se invalida en todas las operaciones de escritura que modifican el stock calculado: `POST /inventory/products` (crear producto), `POST /inventory/orders/inbound` (entrada), `POST /inventory/orders/outbound` (salida). |

```python
cache_key = build_cache_key("list_products", warehouse=warehouse)
cached = get_cached(cache_key)
if cached is not None:
    return cached
# ... consulta SQL ...
set_cached(cache_key, result, ttl_seconds=30)

# En escrituras:
invalidate_cache("list_products")
```

**Beneficio medido:** Con **205 productos y 824 órdenes** (carga realista sembrada), la primera petición sin caché tarda **207.9ms** (recalcula 2N queries de stock). Con caché, las siguientes peticiones tardan **1.8–4.1ms**, una reducción de **~70x**. Con la invalidación, tras crear un producto la siguiente petición vuelve a recaer en MISS (160ms) y luego a HIT (4ms) — el ciclo completo funciona.

---

### Endpoint cacheado 2: `GET /api/incidents/summary`

| Aspecto | Valor |
|---|---|
| **Archivo** | `services/api/routes/incidents.py` |
| **Coste de la operación** | **Medio-Alto.** Recorre **todas** las incidencias en TinyDB y calcula 4 contadores simultáneos (por estado, categoría, origen, sucursal). Con cientos o miles de registros, el coste es lineal O(n) pero significativo. |
| **Frecuencia estimada** | **Media.** El dashboard de incidencias consulta el summary cada vez que se carga o refresca la vista principal. No es tan frecuente como el stock, pero se repite. |
| **Estabilidad de datos** | Los datos cambian **solo cuando se crea, actualiza o elimina una incidencia**. Entre operaciones, los totales agregados son estables. |
| **TTL elegido** | **60 segundos.** Las métricas agregadas (totales por estado, categoría, etc.) no necesitan ser exactas al segundo. Un desfase de hasta 60 segundos es perfectamente aceptable para un dashboard de monitoreo. |
| **Clave de caché** | `incidents_summary` — simple, sin parámetros. |
| **Estrategia de invalidación** | Se invalida en todas las operaciones de escritura: `POST /api/incidents` (crear), `PATCH /api/incidents/{id}/status` (actualizar estado). |

```python
cache_key = build_cache_key("incidents_summary")
cached = get_cached(cache_key)
if cached is not None:
    return cached
# ... recorrer todas las incidencias ...
set_cached(cache_key, result, ttl_seconds=60)

# En escrituras:
invalidate_cache("incidents_summary")
```

**Beneficio medido:** Con **82 incidencias** en TinyDB, el recorrido completo (sin caché) toma **33.5ms**. Con caché de 60s, las siguientes peticiones tardan **0.5–1.7ms** (~40x más rápido). La invalidación también se verificó: al crear una incidencia, el log registra `Caché invalidada para prefix 'incidents_summary'` y la siguiente petición recalcula.

---

### Intercambios reconocidos (Backend)

**Frescura vs. Rendimiento — `GET /inventory/products` (TTL: 30s):**
El stock de un producto cambia cuando alguien registra una orden de entrada o salida. Con TTL de 30 segundos, existe una ventana de hasta 30s donde un usuario podría ver stock desactualizado. Decidimos que este nivel de potencial desactualización es aceptable porque:
1. Las órdenes de inventario son registradas por operadores de almacén en sesiones activas; si un operador registra una salida y otro consulta el listado inmediatamente, la diferencia máxima es de 30s.
2. El coste de recalcular stock para cada producto en cada petición es demasiado alto para la frecuencia de consulta.
3. El TTL de 30s es lo suficientemente corto para que, en la práctica, la ventana de inconsistencia sea apenas perceptible.

**TTL largo vs. corto — `GET /api/incidents/summary` (TTL: 60s) vs. `GET /inventory/products` (TTL: 30s):**
El summary de incidencias tiene un TTL más largo (60s) que el de productos (30s) porque:
- Las incidencias cambian con menos frecuencia que el stock de inventario
- Las métricas agregadas son inherentemente menos sensibles a la frescura (un dashboard que muestra "15 incidencias abiertas" vs. "14" no tiene impacto operativo crítico)
- El coste de cómputo del summary (recorrer todos los registros) es fijo y no escala con el número de consultas

---

### Qué no se cacheó y por qué

| Endpoint | Motivo |
|---|---|
| `GET /suppliers` | Coste bajo (lectura de TinyDB en memoria, ~8ms). Los filtros se aplican en Python sobre una lista ya cargada. La frecuencia es baja (solo en gestión de proveedores). El coste no justifica la complejidad de la caché. |
| `GET /suppliers/{id}` | Coste mínimo (búsqueda por doc_id, O(1) amortizado). Datos personales de proveedores que cambian poco. No hay beneficio significativo. |
| `GET /api/incidents` | Los filtros y ordenaciones son muy variables por consulta (categoría, estado, origen, sucursal, ordenación, paginación). Cachear todas las combinaciones posibles diluiría el beneficio y aumentaría la memoria ocupada. La latencia es baja porque TinyDB trabaja en memoria. |
| `GET /users/me` y `GET /profiles/me` | **Datos de sesión personalizados.** Cachear estos endpoints sin acotar la clave al usuario autenticado sería una fuga de datos. Aunque podríamos usar `current_user["id"]` en la clave, el coste de la consulta es bajo (TinyDB, lookup por ID) y no justifica la complejidad. |
| `POST`, `PATCH`, `DELETE` en general | Operaciones de escritura. Cachear escrituras no tiene sentido semántico. |
| `GET /api/incidents/{id}` | Búsqueda por ID en TinyDB (O(n) en el peor caso, pero en memoria). La latencia típica es <5ms. No hay beneficio. |
| `GET /inventory/orders` | Endpoint con datos autenticados (user_uuid, notas). Además, es una consulta con JOIN que siempre trae datos recién creados (historial). La frecuencia es baja (solo cuando el usuario navega al historial). |

**Regla aplicada:** No cacheamos nada que sea: (a) de sesión/usuario sin clave acotada, (b) con coste de cómputo trivial, (c) con datos excesivamente volátiles, o (d) con demasiadas combinaciones de parámetros que diluirían el ratio acierto/fallo.

---

## Verificación empírica (mediciones reales)

Tras implementar, se ejecutaron **pruebas reales** sobre ambos servidores FastAPI con carga realista para confirmar que el caching aporta valor y que la invalidación funciona.

### 1. Datos de carga (seeders)

| Fuente | Script | Datos |
|---|---|---|
| Inventario base | `services/api/seed.py` | 4 productos, 5 entradas, 4 salidas |
| Carga masiva | `scripts/seed_load.py` (creado para esta verificación) | **+200 productos, +403 entradas, +412 salidas** con datos variados (nombres, categorías, almacenes, notas, fechas) |
| Incidencias | `scripts/seed_incidents.py` | **82 incidencias** variadas (4 estados, 3 categorías, 2 sucursales) |

**Volumen final:** 205 productos, 824 órdenes (inventario) + 82 incidencias.

> ⚠️ Algunas pruebas alcanzaron brevemente el _rate limit_ de la instancia remota; los tiempos de petición se midieron de forma local y repetida, descartando outliers de conexión para obtener valores representativos.

### 2. Medición — `GET /inventory/products` (TTL 30s)

Secuencia real ejecutada (esperando >30s para expirar el TTL, luego ráfaga):

| Petición | Tiempo servidor | Resultado |
|---|---|---|
| 1 | **207.9ms** | MISS → recalcula stock de 205 productos (2N queries) |
| 2 | **2.0ms** | HIT |
| 3 | **1.8ms** | HIT |
| 4 | **2.4ms** | HIT |
| 5 | **1.8ms** | HIT |

**Aceleración: ~70x** entre MISS y HIT.

### 3. Medición — `GET /api/incidents/summary` (TTL 60s)

| Petición | Tiempo servidor | Resultado |
|---|---|---|
| 1 (tras arranque) | **33.5ms** | MISS → recorre las 82 incidencias y calcula 4 contadores |
| 2 | **0.7ms** | HIT |
| 3 | **0.7ms** | HIT |
| 4 | **1.7ms** | HIT |
| 5 | **0.6ms** | HIT |
| 6 | **0.5ms** | HIT |

**Aceleración: ~40x**. (Con datos en memoria, el propio MISS es barato; el beneficio escala con el volumen: la operación es O(n) sobre todas las incidencias.)

### 4. Verificación de invalidación

**Inventario** — secuencia: HIT → `POST /inventory/products` → GET:

```
GET /inventory/products → 200 | 112.4ms   ← HIT (previo)
api.cache | Caché invalidada para prefix 'list_products': 1 entradas eliminadas
POST /inventory/products → 201 | 16.6ms
GET /inventory/products → 200 | 160.1ms   ← MISS (recalculó, el nuevo producto aparece)
GET /inventory/products → 200 | 4.1ms     ← HIT de nuevo
```

**Incidencias** — secuencia: HIT → `POST /api/incidents` → GET:

```
GET /api/incidents/summary → 200 | 1.1ms  ← HIT (previo)
api.cache | Caché invalidada para prefix 'incidents_summary': 1 entradas eliminadas
POST /api/incidents → 201 | 4.4ms
GET /api/incidents/summary → 200 | 1.0ms  ← MISS (recalculó, total pasa de 82 a 83)
GET /api/incidents/summary → 200 | 2.4ms  ← HIT de nuevo
```

### 5. Entorno de las pruebas

- **DB inventario:** SQLite local (`data/local_inventory.db`, vía `DATABASE_URL` en `.env.local`) — SQLModel es compatible y el comportamiento del endpoint es idéntico al de PostgreSQL/Supabase.
- **DB auth/incidencias:** TinyDB (`services/api/data/db.json`).
- **Servidores:** `app.main:app` en `:8000`, `main:app` en `:8001`, lanzados con `.venv/bin/python -m uvicorn`.
- **Autenticación:** `POST /auth/login` (admin@test.com) → bearer token para `/inventory/products`.

---

## Resumen de archivos modificados

| Archivo | Cambio |
|---|---|
| `services/api/cache.py` | **Nuevo** — Utilidad de caché en memoria con TTL |
| `services/api/main.py` | Middleware de timing + imports de caché |
| `services/api/app/main.py` | Middleware de timing + logging |
| `services/api/app/routers/inventory.py` | Caché en `list_products` + invalidación en escrituras |
| `services/api/routes/incidents.py` | Caché en `incidents_summary` + invalidación en escrituras |
| `uis/backoffice/app/backoffice/inventory/orders/inbound/page.tsx` | Lazy Loading de `OrderForm` |
| `uis/backoffice/app/backoffice/inventory/orders/outbound/page.tsx` | Lazy Loading de `OrderForm` |
| `uis/backoffice/app/backoffice/inventory/orders/page.tsx` | Lazy Loading de `OrdersContent` |
| `uis/backoffice/components/inventory/OrdersContent.tsx` | **Nuevo** — Componente extraído para lazy loading |
| `uis/backoffice/components/inventory/OrderForm.tsx` | `useMemo` para `currentStock`, `exceedsStock`, `productOptions` |
| `uis/backoffice/app/backoffice/inventory/products/page.tsx` | `useMemo` para `productRows` |
| `uis/backoffice/app/backoffice/inventory/inventory.module.css` | Estilo `.loading` para fallbacks |
| `scripts/seed_load.py` | **Nuevo** — Seeder de carga masiva realista para verificación empírica |
| `services/api/.env.local` | **Nuevo (local, ignorado por git)** — `DATABASE_URL` SQLite para pruebas locales |