# Auditoría — ANTES de corregir

> Fecha: 2026-10-10
> Modo: Producción (`npm run build && npm run start`)
> Navegador: Chrome
> Backend: FastAPI corriendo en `:8000`

---

## Backoffice — Productos (`/backoffice/inventory/products`)

| Métrica | Móvil | Escritorio |
|---|---|---|
| **Performance** | 94 | 99 |
| **Accessibility** | 100 | 100 |
| **Best Practices** | 100 | 100 |
| **SEO** | 60 | 60 |

### Core Web Vitals

| Métrica | Móvil | Escritorio |
|---|---|---|
| LCP | 🟡 (amarillo) | 🟢 (verde) |
| CLS | 🟢 (verde) | 🟢 (verde) |
| TBT | 🟢 (verde) | 🟢 (verde) |
| FCP | 🟢 (verde) | 🟢 (verde) |

---

## Talent Pipeline Tracker — Dashboard (`/`)

| Métrica | Móvil | Escritorio |
|---|---|---|
| **Performance** | 58 | 79 |
| **Accessibility** | 90 | 88 |
| **Best Practices** | 100 | 100 |
| **SEO** | 63 | 63 |

### Core Web Vitals

| Métrica | Móvil | Escritorio |
|---|---|---|
| LCP | 🔴 (rojo) | 🟡 (amarillo) |
| CLS | 🔴 (rojo) | 🟡 (amarillo) |
| TBT | 🟢 (verde) | 🟢 (verde) |
| FCP | 🟡 (amarillo) | 🟢 (verde) |
| SI (Solicitudes de imágenes) | 🔴 (rojo) | 🔴 (rojo) |

---

## Observaciones iniciales

### Backoffice (TrackFlow)
- ✅ Rendimiento excelente (94/99), casi sin margen de mejora.
- ✅ Accesibilidad y Best Practices perfectas (100/100).
- ⚠️ **SEO bajo (60)** en ambos — posible falta de meta tags, Open Graph, lang attribute o problemas de rastreo.
- ✅ Solo LCP en amarillo en móvil, el resto impecable.

### Talent Pipeline Tracker
- ❌ **Rendimiento crítico en móvil (58)** — el peor puntaje de toda la auditoría.
- ❌ **LCP rojo** en móvil y amarillo en escritorio → contenido principal tarda en cargar.
- ❌ **CLS rojo** en móvil y amarillo en escritorio → la página se desplaza visualmente durante la carga.
- ❌ **SI (Solicitudes de imágenes) rojo** en ambos → muchas peticiones de imágenes bloqueando.
- ⚠️ **SEO bajo (63)** — mismo problema que Backoffice.
- 📊 **Accesibilidad (90/88)** — buena pero podría mejorar.

### Generales
- SEO es el punto débil común (60-63). Probablemente falta `<meta name="description">`, Open Graph y configuración de robots.
- Performance del Talent Pipeline Tracker necesita atención urgente, especialmente en móvil.

---

## Capturas

- `backoffice-products-mobile.png`
- `backoffice-products-desktop.png`
- `talent-dashboard-mobile.png`
- `talent-dashboard-desktop.png`