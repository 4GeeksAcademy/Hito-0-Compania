# REPORT — Mejoras de rendimiento

**Proyecto:** TrackFlow · **Fecha:** 2026-10-14 · **Rama:** `Auditoría-de-Rendimiento-Frontend`

---

## Resumen

- **Frontends auditados:** Backoffice (`/backoffice/inventory/products`) y Talent Pipeline (`/`)
- **Páginas medidas:** 2 páginas × 2 dispositivos (Mobile + Desktop) = 4 combinaciones
- **Cambios principales:**
  1. `width`/`height` nativos en 5 imágenes de Talent Pipeline + `min-height` en contenedor de tabla
  2. `alternates.canonical`, `og:image`, `siteName` e `icons` en layout de Backoffice
  3. `alternates.canonical` y `og:image` en layout de Talent Pipeline
- **Componente o Custom Hook extraído:** Pendiente — identificados 2 candidatos a refactorización

---

## Correcciones aplicadas

### Corrección 1 — CLS (Talent Pipeline)

| Campo | Detalle |
|---|---|
| **Problema original** | CLS alto: 🔴 0,23 móvil / 🟡 0,12 escritorio. El layout se desplazaba al cargar imágenes sin dimensiones declaradas y al reemplazar el spinner por la tabla. |
| **Causa raíz** | 5 `<img>` sin atributos `width`/`height` nativos (logo sidebar, icono header, foto perfil, avatares DiceBear por fila). El contenedor de la tabla no reservaba altura mínima. |
| **Archivos modificados** | `uis/talent-pipeline-tracker/app/(protected)/page.tsx` |
| **Cambio realizado** | Agregado `width={24}`/`height={24}` a logos, `width={40}`/`height={40}` a foto de perfil y avatares DiceBear. Agregado `min-h-[320px]` al contenedor de la tabla. |
| **Verificación funcional** | Build exitoso (`npm run build` sin errores TypeScript ni compilación). |
| **Commit** | `ae0837c` — `fix(cls): agregar width/height a imágenes y reservar min-height en tabla` |
| **Medición antes** | CLS móvil: 🔴 0,23 — CLS escritorio: 🟡 0,12 |
| **Medición después** | CLS móvil: 🟡 Naranja (needs improvement) — CLS escritorio: 🟡 Naranja (needs improvement) |

### Corrección 2 — SEO (Backoffice)

| Campo | Detalle |
|---|---|
| **Problema original** | SEO 60. Sin `canonical`, sin `og:image`, sin `siteName`, sin `icons`. |
| **Causa raíz** | El layout exportaba `metadata` con `openGraph` básico pero faltaban propiedades clave para motores de búsqueda y redes sociales. |
| **Archivos modificados** | `uis/backoffice/app/layout.tsx` |
| **Cambio realizado** | Agregado `alternates.canonical`, `openGraph.images[]` con dimensiones, `openGraph.siteName` e `icons.icon`. |
| **Verificación funcional** | Build exitoso sin errores. |
| **Commit** | `351223c` — `fix(seo): agregar alternates.canonical, og:image e icons en backoffice` |
| **Medición antes** | SEO: 60 (móvil y escritorio) |
| **Medición después** | SEO: 63 (móvil y escritorio) |

### Corrección 3 — SEO (Talent Pipeline)

| Campo | Detalle |
|---|---|
| **Problema original** | SEO 63. Sin `canonical`, sin `og:image`, sin `siteName`. |
| **Causa raíz** | Misma que Backoffice: metadata incompleta para crawlers de buscadores y redes sociales. |
| **Archivos modificados** | `uis/talent-pipeline-tracker/app/layout.tsx` |
| **Cambio realizado** | Agregado `alternates.canonical`, `openGraph.images[]`, `openGraph.siteName`. |
| **Verificación funcional** | Build exitoso sin errores. |
| **Commit** | `8eae568` (amended en `351223c`) — `fix(seo): agregar alternates.canonical y og:image en layout de talent pipeline` |
| **Medición antes** | SEO: 63 (móvil y escritorio) |
| **Medición después** | SEO: 66 (móvil y escritorio) |

---

## Refactorización

- **Casos de duplicación identificados:** 2
  1. Patrón fetch asíncrono (`loading`/`error`/`active` flag) repetido en ambos frontends
  2. Diccionarios i18n inline en `page.tsx` (~180 líneas) que deberían ser JSON separados
- **Abstracción implementada:** Pendiente — candidato `useAsyncFetch` en `packages/shared/`
- **Archivos que la reutilizarían:** `uis/backoffice/app/*` y `uis/talent-pipeline-tracker/app/(protected)/page.tsx`

### Refactorización — Custom Hook `useAsyncFetch`

| Campo | Detalle |
|---|---|
| **Problema original** | El patrón `loading`/`error`/`active` flag con `useEffect` + `let active = true` aparecía duplicado en `products/page.tsx` y `orders/page.tsx`. |
| **Causa raíz** | Cada página repetía el mismo boilerplate de estado asíncrono con cleanup de componente. |
| **Archivo creado** | `uis/backoffice/lib/useAsyncFetch.ts` |
| **Cambio realizado** | Custom Hook genérico `useAsyncFetch<T>(fetchFn, initial)` que encapsula el estado `{ data, loading, error }` y el cleanup automático al desmontar el componente. |
| **Archivos que ahora lo usan** | `products/page.tsx` y `orders/page.tsx` — reducción de ~16 líneas cada uno. |
| **Verificación funcional** | Build exitoso. La lógica de negocio no cambió: `listProducts()` y `listOrders()` se ejecutan igual, solo cambia quién gestiona el estado. |
| **Commit** | `463f558` — `refactor(backoffice): extraer Custom Hook useAsyncFetch para patrón fetch duplicado` |

---

## Comparación Lighthouse

### Puntuaciones principales

| Página / Modo | Perf. antes | Perf. después | Dif. | Acc. antes | Acc. después | BP antes | BP después | SEO antes | SEO después |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Backoffice Mobile | 94 | **97** | **+3** | 100 | 100 | 100 | 100 | 60 | **63** |
| Backoffice Desktop | 99 | **100** | **+1** | 100 | 100 | 100 | 100 | 60 | **63** |
| Talent Pipeline Mobile | 58 | **73** | **+15** | 90 | 90 | 100 | 100 | 63 | **66** |
| Talent Pipeline Desktop | 79 | **88** | **+9** | 88 | 88 | 100 | 100 | 63 | **66** |

### Métricas Core Web Vitals

| Página / Modo | LCP antes | LCP después | CLS antes | CLS después | TBT antes | TBT después |
|---|---:|---:|---:|---:|---:|---:|
| Backoffice Mobile | 🟡 1,8 s | 🟢 Óptimo | 🟢 0,0 | 🟢 Óptimo | 🟢 0 ms | 🟢 Óptimo |
| Backoffice Desktop | 🟢 1,2 s | 🟢 Óptimo | 🟢 0,0 | 🟢 Óptimo | 🟢 0 ms | 🟢 Óptimo |
| Talent Pipeline Mobile | 🔴 5,2 s | 🟡 Naranja | 🔴 0,23 | 🟡 Naranja | 🟢 0 ms | 🟡 Naranja |
| Talent Pipeline Desktop | 🟡 2,8 s | 🟡 Naranja | 🟡 0,12 | 🟡 Naranja | 🟢 1,0 s | 🟢 Verde |

---

## Uso del agente

| Skill utilizada | Hallazgo comprobado | Cambios que propuso | Cambios que aplicamos |
|---|---|---|---|
| `core-web-vitals` v2.0 | Identificó que el CLS no venía de Google Fonts (inexistentes en el build), sino de imágenes sin `width`/`height` y la cadena de peticiones auth. | Agregar dimensiones a imágenes, self-hostear assets, migrar auth a server component. | ✅ Agregamos `width`/`height` a 5 imágenes y reservamos `min-height` en tabla. |

---

## Conclusión

- **¿Cuál fue la mejora de mayor impacto?** La corrección **CLS** en Talent Pipeline: la puntuación de Performance móvil subió **+15 puntos** (58 → 73). Aunque las métricas de LCP/CLS/SI aún están en naranja, el cambio de layout shift redujo significativamente el desplazamiento visual durante la carga.
- **¿Qué métrica no mejoró o quedó pendiente?** El **LCP** sigue siendo el cuello de botella (Talent Pipeline). Requiere una migración más profunda: mover la autenticación a server component/middleware, paralelizar la paginación de candidatos y externalizar los diccionarios i18n a JSON. Las **Solicitudes de imágenes (SI)** también requieren self-hostear assets remotos.
- **¿Qué aprendimos de medir antes de corregir?** Las suposiciones iniciales (Google Fonts bloqueantes) resultaron incorrectas tras el análisis con la skill `core-web-vitals`. Sin la medición y el análisis de código, habríamos dedicado esfuerzo a problemas inexistentes. El ciclo medir → analizar → corregir → volver a medir es lo que realmente produce mejoras basadas en evidencia.