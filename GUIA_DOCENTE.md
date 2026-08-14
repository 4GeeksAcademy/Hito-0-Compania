# Guía rápida para docente

Esta guía permite probar la entrega de Fase 1 y Fase 2 en pocos minutos.

## 1) Preparación

Ubicación del proyecto:

- /workspaces/Hito-0-Compania

CSV de prueba sugerido:

- COMPANY.csv

## 2) Fase 1 (Script)

Ejecutar desde la raíz del proyecto:

```bash
cd /workspaces/Hito-0-Compania
python3 scripts/analyze.py COMPANY.csv
```

## 3) Fase 2 (API + Frontend)

Abrir dos terminales.

### Terminal 1: Backend API

```bash
cd /workspaces/Hito-0-Compania/services/api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Rutas a validar:

1. Health: http://127.0.0.1:8000/health
2. Docs: http://127.0.0.1:8000/docs
3. Endpoint análisis: POST /api/incidents/analyze
4. Endpoint exportación: GET /api/incidents/results/export

### Terminal 2: Frontend Backoffice

```bash
cd /workspaces/Hito-0-Compania/uis/backoffice
python3 -m http.server 8080
```

Abrir:

- http://127.0.0.1:8080

## 4) Flujo funcional esperado en interfaz

1. Cargar COMPANY.csv desde la interfaz (selector o drag and drop).
2. Pulsar Analizar.
3. Ver resumen con métricas, desgloses e inválidos por tipo.
4. Pulsar Descargar CSV para exportar resultados.

## 5) Prueba rápida por curl (opcional)

Desde raíz:

```bash
cd /workspaces/Hito-0-Compania
curl -i -X POST http://127.0.0.1:8000/api/incidents/analyze -F file=@COMPANY.csv
curl -L http://127.0.0.1:8000/api/incidents/results/export -o results_api.csv
```

## 6) Si se prueba en Codespaces (URL pública)

Si el frontend muestra `Failed to fetch`, abrir la UI con `apiBase` apuntando al puerto 8000:

```text
https://<tu-url-8080>.app.github.dev/?apiBase=https://<tu-url-8000>.app.github.dev
```

Además, comprobar en Ports que 8000 y 8080 estén en visibilidad Public.

## 7) Archivos clave de la entrega

1. scripts/analyze.py
2. services/api/main.py
3. services/api/incident_analyzer.py
4. uis/backoffice/index.html
5. uis/backoffice/main.js
6. uis/backoffice/styles.css
7. data/eval/incidencias_expected_metrics.json
