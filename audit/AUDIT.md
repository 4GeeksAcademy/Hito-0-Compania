# AUDIT.md — Auditoría de rendimiento

**Proyecto:** TrackFlow · **Fecha:** 2026-10-10 · **Rama:** `Auditoría-de-Rendimiento-Frontend`

---

## Entorno de medición

- **Navegador:** Chrome (Lighthouse)
- **Modo de ejecución:** Producción (`npm run build && npm run start`)
- **URLs medidas:**
  - Backoffice: `http://localhost:3000/backoffice/inventory/products`
  - Talent Pipeline: `http://localhost:3001/`
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

---

## Problemas detectados

| Resultado observado | Posible causa raíz | Corrección propuesta |
|---|---|---|
| **LCP lento** (🔴 5,2 s móvil / 🟡 2,8 s escritorio) | Cadena de 3 peticiones cliente sincrónicas: `AuthContext` → `AuthGuard` (bloquea todo) → `fetchCandidates` con paginación secuencial (`getRecords` recorre N páginas con `await` una por una). Además, `page.tsx` es `'use client'` con diccionarios inline de ~180 líneas inflando el JS bundle inicial. | Migrar a server components o middleware de auth; paralelizar paginación con `Promise.all` o endpoint batch; mover i18n a archivos JSON separados. |
| **CLS alto** (🔴 0,23 móvil / 🟡 0,12 escritorio) | 4 `<img>` sin `width`/`height` nativos (logo sidebar, icono header, foto perfil, avatares DiceBear por fila). El spinner de carga → tabla no reserva altura mínima. AuthGuard muestra spinner de 60vh y luego lo reemplaza por contenido. | Agregar `width`/`height` a todas las imágenes; reservar `min-height` en el contenedor de la tabla. |
| **SI en rojo** (móvil y escritorio) | 3 imágenes remotas desde `lh3.googleusercontent.com` (logo duplicado en sidebar + header, foto perfil). Avatares DiceBear: 1 petición SVG por fila de candidatos. Sin assets locales en `public/`. | Self-hostear imágenes en `public/`; cachear avatares DiceBear; eliminar descarga duplicada del logo. |
| **SEO bajo** (60-63 ambos frontends) | Ambos layouts tienen `openGraph`, `robots` e `icons`, pero **sin `canonical`** ni **`og:image`**. Sin Twitter Card. Mismo título/desc para todas las rutas (hereda el layout raíz). | Agregar `canonical` y `og:image` en metadata; considerar per-route metadata con `generateMetadata`. |
| **Código duplicado** — patrón fetch asíncrono | Backoffice y Talent Pipeline repiten el mismo patrón `loading`/`error`/`active` flag para llamadas API con `fetch` + `cache: 'no-store'`. | Extraer Custom Hook `useAsyncFetch` compartido en `packages/shared/`.

---

## Puntuaciones finales (Lighthouse — DESPUÉS)

| Página | Modo | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|---:|
| Backoffice `/backoffice/inventory/products` | Mobile | 97 | 100 | 100 | 63 |
| Backoffice `/backoffice/inventory/products` | Desktop | 100 | 100 | 100 | 63 |
| Talent Pipeline `/` | Mobile | 73 | 90 | 100 | 66 |
| Talent Pipeline `/` | Desktop | 88 | 88 | 100 | 66 |

### Resumen de impacto

| Página / Modo | Perf. antes | Perf. después | Dif. | SEO antes | SEO después | Dif. |
|---|---:|---:|---:|---:|---:|---:|
| Backoffice Mobile | 94 | **97** | **+3** | 60 | **63** | **+3** |
| Backoffice Desktop | 99 | **100** | **+1** | 60 | **63** | **+3** |
| Talent Pipeline Mobile | 58 | **73** | **+15** | 63 | **66** | **+3** |
| Talent Pipeline Desktop | 79 | **88** | **+9** | 63 | **66** | **+3** |

---

## Skills utilizadas

| Skill | Versión | Propósito | Evidencia |
|---|---|---|---|
| `core-web-vitals` | 2.0 | Diagnosticar causas raíz de LCP, CLS e INP en Talent Pipeline. | SKILL.md en `.agents/skills/core-web-vitals/`. Se usaron referencias LCP, CLS e INP para verificar hallazgos. |

---

## Acciones correctivas

- [ ] **LCP:** Migrar auth a server component/middleware; paralelizar paginación; mover i18n a archivos JSON
- [ ] **CLS:** Agregar `width`/`height` a imágenes; reservar `min-height` en tabla
- [ ] **SI:** Self-hostear imágenes locales; cachear DiceBear; eliminar logo duplicado
- [ ] **SEO:** Agregar `canonical` y `og:image` en ambos layouts
- [ ] **Código duplicado:** Extraer Custom Hook `useAsyncFetch` compartido