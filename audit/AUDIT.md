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
| **LCP lento** en Talent Pipeline (🔴 5,2 s móvil / 🟡 2,8 s escritorio) | Google Fonts vía CSS `@import` bloqueante en `globals.css` (Inter + Material Symbols). El navegador descarga fonts externas antes de renderizar, sumando ~2-3 s. | Reemplazar `@import` por `next/font/google` (Geist ya precargado en `layout.tsx`). |
| **CLS alto** en Talent Pipeline (🔴 0,23 móvil / 🟡 0,12 escritorio) | `globals.css` no define dimensiones explícitas para SVG ni favicon. El contenido dinámico (tabla de candidatos) tampoco reserva espacio. | Asignar `width`/`height`/`aspect-ratio` a recursos gráficos y reservar espacio para datos asíncronos. |
| **SI en rojo** en Talent Pipeline (móvil y escritorio) | Favicon `.ico` de 26 KB y 6 SVGs en `public/` no referenciados pero servidos. | Reemplazar favicon por SVG de ~270 B y eliminar assets no utilizados. |
| **SEO bajo** en ambos frontends (60-63) | Sin Open Graph, sin meta description específica por página, sin canonical ni robots. | Agregar `openGraph`, `robots` y `icons` en el `metadata` export de cada layout. |
| **Código duplicado** — patrón fetch asíncrono | Backoffice y Talent Pipeline repiten el mismo patrón `loading`/`error`/`active` flag para llamadas API. | Extraer Custom Hook `useAsyncFetch` compartido en `packages/shared/`.

---

## Acciones correctivas

- [ ] Quitar `@import` Google Fonts → usar `next/font` (ya precargado)
- [ ] Reemplazar favicon 26 KB por SVG ~270 B
- [ ] Eliminar SVGs no referenciados en `public/`
- [ ] Agregar Open Graph + robots + canonical en layouts
- [ ] Extraer hook `useAsyncFetch` compartido