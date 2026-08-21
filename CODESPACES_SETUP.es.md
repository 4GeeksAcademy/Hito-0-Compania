# Guia de arranque en Codespaces

Esta guia sirve para levantar la API y el backoffice en un Codespace nuevo, evitando problemas de puertos, CORS y conexion frontend-backend.

## 1. Requisitos

- Estar en la raiz del proyecto.
- Tener Python 3 disponible en el Codespace.

## 2. Setup inicial

1. Abrir terminal y ejecutar:

   cd /workspaces/Hito-0-Compania

2. Asegurar binarios de usuario en PATH:

   export PATH="$HOME/.local/bin:$PATH"

3. Si uv no existe, instalarlo:

   python3 -m pip install --user uv

4. Cargar datos iniciales en TinyDB:

   uv run seed

Resultado esperado:
- Primera vez: Seeder completado. Registros insertados: 15
- Siguientes veces: Seeder completado. Registros insertados: 0

## 3. Levantar backend y frontend

Importante: en este proyecto el backoffice se sirve desde la misma API.
No levantar http.server en 8080.

1. Iniciar API:

   uv run uvicorn services.api.main:app --host 0.0.0.0 --port 8000

2. Dejar esa terminal abierta.

## 4. Abrir desde navegador en Codespaces

1. Abrir la pestaña Ports en VS Code.
2. Confirmar que el puerto 8000 esta Forwarded.
3. Abrir Open in Browser sobre el puerto 8000.
4. Probar rutas:

- /docs
- /suppliers
- /backoffice/

## 5. Validacion rapida por terminal

En otra terminal:

1. Verificar API:

   curl -s -o /dev/null -w "suppliers:%{http_code}\n" http://localhost:8000/suppliers

2. Verificar backoffice integrado:

   curl -s -o /dev/null -w "backoffice:%{http_code}\n" http://localhost:8000/backoffice/

Resultado esperado:
- suppliers:200
- backoffice:200

## 6. Problemas comunes y solucion

### Error: address already in use

Hay otro proceso usando el puerto 8000.

1. Ver proceso:

   lsof -i :8000 -P -n

2. Cerrar proceso:

   kill <PID>

3. Reintentar arranque de API.

### Error: Exit Code 143

No es bug de la app. Significa que el proceso fue terminado por senal (por ejemplo Ctrl+C o limpieza de terminal).

### 404 en /

Es normal. No hay endpoint raiz.
Usar /docs, /suppliers o /backoffice/.

### Failed to fetch en backoffice

Causas tipicas:
- API apagada.
- Puerto 8000 no forwardeado.
- Se abrio una URL vieja en el navegador.

Solucion:
1. Confirmar API viva con curl local.
2. Abrir solo la URL del puerto 8000.
3. Entrar a /backoffice/ desde ese mismo origen.
4. Hacer recarga dura del navegador (Ctrl+Shift+R).

## 7. Comando unico de verificacion

Con API levantada, correr:

curl -i http://localhost:8000/suppliers

Debe devolver HTTP 200.
