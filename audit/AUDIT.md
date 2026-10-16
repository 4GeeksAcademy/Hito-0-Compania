# AUDIT.md — Auditoría de rendimiento

**Proyecto:** TrackFlow · **Fecha:** 2026-10-10 · **Rama:** `Auditoría-de-Rendimiento-Frontend`

---

## Entorno de medición

- **Navegador:** Chrome (Lighthouse)
- **Modo de ejecución:** Producción (`npm run build && npm run start`)
- **URLs medidas:**
  - Backoffice: `http://localhost:3000/backoffice/inventory/products`
  - Talent Pipeline: `http://localhost:3001/`
  - Talent Pipeline: `http://localhost:3001/candidates/53f2bbdc-4ea0-4b34-b076-4f8e7c2736ac`
- **Dispositivos simulados:** Mobile y Desktop
- **Backend:** FastAPI en `:8000` con Supabase vía pooler

---

## Puntuaciones iniciales (Lighthouse — ANTES)

| Página | Modo | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | FCP | SI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Backoffice `/backoffice/inventory/products` | Mobile | 94 | 100 | 100 | 60 | 🟡 1,8 s | 🟢 0,0 | 🟢 0 ms | 🟢 | 🟢 |
| Backoffice `/backoffice/inventory/products` | Desktop | 99 | 100 | 100 | 60 | 🟢 1,2 s | 🟢 0,0 | 🟢 0 ms | 🟢 | 🟢 |
| Talent Pipeline `/` | Mobile | 58 | 90 | 100 | 63 | 🔴 5,2 s | 🔴 0,23 | 🟢 0 ms | 🟡 2,1 s | 🔴 |
| Talent Pipeline `/` | Desktop | 79 | 88 | 100 | 63 | 🟡 2,8 s | 🟡 0,12 | 🟢 0 ms | 🟢 1,0 s | 🔴 |
| Talent Pipeline `/candidates/[id]` | Mobile | 71 | 98 | 100 | 63 | 🟡 Naranja | 🟢 0,0 | 🟡 Naranja | 🟢 | 🟡 |
| Talent Pipeline `/candidates/[id]` | Desktop | 90 | 98 | 100 | 63 | 🟡 Naranja | 🟢 0,0 | 🟢 0 ms | 🟢 | 🟡 |

---

## Problemas detectados

| Resultado observado | Posible causa raíz | Corrección propuesta |
|---|---|---|
| **LCP lento** (🔴 5,2 s móvil / 🟡 2,8 s escritorio) | Cadena de 3 peticiones cliente sincrónicas: `AuthContext` → `AuthGuard` (bloquea todo) → `fetchCandidates` con paginación secuencial (`getRecords` recorre N páginas con `await` una por una). Además, `page.tsx` es `'use client'` con diccionarios inline de ~180 líneas inflando el JS bundle inicial. | Migrar a server components o middleware de auth; paralelizar paginación con `Promise.all` o endpoint batch; mover i18n a archivos JSON separados. |
| **CLS alto** (🔴 0,23 móvil / 🟡 0,12 escritorio) | 4 `<img>` sin `width`/`height` nativos (logo sidebar, icono header, foto perfil, avatares DiceBear por fila). El spinner de carga → tabla no reserva altura mínima. AuthGuard muestra spinner de 60vh y luego lo reemplaza por contenido. | Agregar `width`/`height` a todas las imágenes; reservar `min-height` en el contenedor de la tabla. |
| **SI en rojo** (móvil y escritorio) | 3 imágenes remotas desde `lh3.googleusercontent.com` (logo duplicado en sidebar + header, foto perfil). Avatares DiceBear: 1 petición SVG por fila de candidatos. Sin assets locales en `public/`. | Self-hostear imágenes en `public/`; cachear avatares DiceBear; eliminar descarga duplicada del logo. |
| **SEO bajo** (60-63 ambos frontends) | Ambos layouts tienen `openGraph`, `robots` e `icons`, pero **sin `canonical`** ni **`og:image`**. Sin Twitter Card. Mismo título/desc para todas las rutas (hereda el layout raíz). | Agregar `canonical` y `og:image` en metadata; considerar per-route metadata con `generateMetadata`. |

### Código duplicado

Se identificaron **dos casos** de código repetido:

| # | Archivos | Código repetido | Abstracción propuesta | Implementado |
|---|---|---|---|---|
| 1 | `products/page.tsx` y `orders/page.tsx` en Backoffice | Patrón fetch asíncrono (`loading`/`error`/`active` flag) con `useEffect` + `let active = true`. ~18 líneas por página. | Custom Hook `useAsyncFetch<T>(fetchFn, initial)` | ✅ **Sí** — `uis/backoffice/lib/useAsyncFetch.ts` |
| 2 | `page.tsx` (home) y `candidates/[id]/page.tsx` en Talent Pipeline | Diccionarios i18n inline (~180 líneas en home, ~60 en candidates) con las mismas claves traducidas, repetidos en cada archivo `'use client'`. | Archivos JSON separados por idioma en `public/locales/` y función `useTranslation(locale)` | ❌ Pendiente — no bloqueante para rendimiento |

---

## Refactorización aplicada

| Código duplicado | Dónde se repetía | Abstracción implementada | Archivos que la usan |
|---|---|---|---|
| Patrón fetch asíncrono (`loading`/`error`/`active` flag) | `products/page.tsx` y `orders/page.tsx` en Backoffice | Custom Hook `useAsyncFetch<T>(fetchFn, initial)` en `uis/backoffice/lib/useAsyncFetch.ts` | `products/page.tsx` y `orders/page.tsx` — ~16 líneas menos cada uno |

---

## Puntuaciones finales (Lighthouse — DESPUÉS)

| Página | Modo | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|---:|
| Backoffice `/backoffice/inventory/products` | Mobile | 97 | 100 | 100 | 63 |
| Backoffice `/backoffice/inventory/products` | Desktop | 100 | 100 | 100 | 63 |
| Talent Pipeline `/` | Mobile | 73 | 90 | 100 | 66 |
| Talent Pipeline `/` | Desktop | 88 | 88 | 100 | 66 |
| Talent Pipeline `/candidates/[id]` | Mobile | 71 | 98 | 100 | 66 |
| Talent Pipeline `/candidates/[id]` | Desktop | 90 | 98 | 100 | 66 |

### Resumen de impacto

| Página / Modo | Perf. antes | Perf. después | Dif. | SEO antes | SEO después | Dif. |
|---|---:|---:|---:|---:|---:|---:|
| Backoffice Mobile | 94 | **97** | **+3** | 60 | **63** | **+3** |
| Backoffice Desktop | 99 | **100** | **+1** | 60 | **63** | **+3** |
| Talent Pipeline Mobile | 58 | **73** | **+15** | 63 | **66** | **+3** |
| Talent Pipeline Desktop | 79 | **88** | **+9** | 63 | **66** | **+3** |
| Talent Pipeline `/candidates/[id]` Mobile | 71 | **71** | **0** | 63 | **66** | **+3** |
| Talent Pipeline `/candidates/[id]` Desktop | 90 | **90** | **0** | 63 | **66** | **+3** |

> **Nota:** La página `/candidates/[id]` hereda las correcciones SEO del layout compartido, por eso su SEO sube de 63→66 sin cambios específicos. Performance no se modificó en esta página porque las correcciones de CLS eran específicas de la home.

---

## Skills utilizadas

| Skill | Versión | Propósito | Evidencia |
|---|---|---|---|
| `core-web-vitals` | 2.0 | Diagnosticar causas raíz de LCP, CLS e INP en Talent Pipeline. | SKILL.md en `.agents/skills/core-web-vitals/`. Se usaron referencias LCP, CLS e INP para verificar hallazgos. |

---

## Acciones correctivas

- [ ] **LCP:** Migrar auth a server component/middleware; paralelizar paginación; mover i18n a archivos JSON
- [x] **CLS:** Agregar `width`/`height` a imágenes; reservar `min-height` en tabla (`ae0837c`)
- [ ] **SI:** Self-hostear imágenes locales; cachear DiceBear; eliminar logo duplicado
- [x] **SEO:** Agregar `canonical` y `og:image` en ambos layouts (`351223c` + `0f7cdcf`)
- [x] **Código duplicado:** Extraer Custom Hook `useAsyncFetch` compartido (`463f558`)