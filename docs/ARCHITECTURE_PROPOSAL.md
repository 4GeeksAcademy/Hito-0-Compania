
# Propuesta de Arquitectura Backend - TrackFlow

## 1. Patrón Arquitectónico Propuesto y Justificación

Se propone una Arquitectura en capas dentro de un Monolito Modular, complementada con el patrón de Puertos y Adaptadores para las integraciones externas.

**Justificación alineada a la empresa:** TrackFlow cuenta con 130 empleados, dos almacenes sin inventario unificado, 8 transportistas gestionados de forma manual, devoluciones con alto volumen y reporting ejecutivo armado a mano. Un monolito modular permite centralizar inventario, envíos, devoluciones y métricas en una sola base operativa sin añadir la complejidad de despliegue ni fallos distribuidos que implicaría una arquitectura de microservicios.

**Alternativas descartadas:**

- **MVC Clásico:** Queda corto para orquestar múltiples integraciones, flujos asíncronos y reglas complejas de transporte.
- **Microservicios:** Prematuro; aumentaría el costo operativo en un equipo técnico limitado antes de consolidar el negocio.
- **Serverless:** Inadecuado como núcleo por la necesidad de estado persistente y coordinación continua entre dominios.

## 2. Estructura de Carpetas y Módulos

La aplicación vivirá en `services/trackflow-api/app/` dentro del monorepo, organizada por dominios de negocio:

```text
services/trackflow-api/app/
├── main.py                   # Punto de entrada de FastAPI
├── core/                     # Configuración global, seguridad y base de datos
├── domains/                  # Módulos aislados por responsabilidad de negocio
│   ├── inventory/
│   ├── orders/
│   ├── shipments/
│   ├── carriers/
│   ├── returns/
│   ├── customer_support/
│   ├── clients/
│   └── reporting/
├── infrastructure/           # Adaptadores externos (ERP, almacenes, transportistas)
└── shared/                   # Excepciones, enums y utilidades comunes
```

Cada dominio funcional interno contendrá su propia separación de capas:

- `router.py`: Endpoints y traducción HTTP.
- `schemas.py`: Contratos de validación con Pydantic.
- `service.py`: Lógica de negocio y casos de uso.
- `repository.py / models.py`: Acceso a datos y entidades ORM.

El criterio de separación es mantener juntos los casos de uso que cambian por la misma razón: inventario cambia por reglas de almacén, `returns` por políticas de logística inversa, `carriers` por integraciones con proveedores y `clients` por configuraciones comerciales específicas de cada marca.

## 3. Organización de Endpoints y Routers

Los endpoints se agruparán estrictamente por dominio de negocio (no por tipo de usuario) bajo el prefijo `/api/v1`:

- `inventory` (`/api/v1/inventory`): stock consolidado, ubicaciones y movimientos entre almacenes. Ejemplos: `GET /api/v1/inventory/stock`, `POST /api/v1/inventory/movements`.
- `orders` (`/api/v1/orders`): asignación de inventario y cambio de estados de pedidos. Ejemplos: `GET /api/v1/orders/{order_id}`, `PATCH /api/v1/orders/{order_id}/status`.
- `shipments` (`/api/v1/shipments`): seguimiento, registro de eventos e incidencias de envíos. Ejemplos: `GET /api/v1/shipments/{shipment_id}/tracking`, `POST /api/v1/shipments/{shipment_id}/incidents`.
- `carriers` (`/api/v1/carriers`): tarifas, métricas y gestión de webhooks de transportistas. Ejemplos: `GET /api/v1/carriers/{carrier_id}/performance`, `POST /api/v1/carriers/webhooks/{carrier_name}`.
- `returns` (`/api/v1/returns`): autorización de devoluciones, inspección y políticas por país. Ejemplos: `POST /api/v1/returns/{return_id}/decision`, `GET /api/v1/returns/policies`.
- `customer_support` (`/api/v1/support`): centralización de tickets y consultas de rastreo. Ejemplos: `POST /api/v1/support/tickets`, `GET /api/v1/support/tracking-queries/{query_id}`.
- `clients` (`/api/v1/clients`): configuración operativa y comercial por marca. Ejemplos: `GET /api/v1/clients/{client_id}`, `PATCH /api/v1/clients/{client_id}/settings`.
- `reporting` (`/api/v1/reports`): consolidado de métricas operativas. Ejemplos: `GET /api/v1/reports/operations`, `GET /api/v1/reports/executive-summary`.

## 4. Influencia de la Estructura Estándar de FastAPI

La convención de FastAPI favorece separar `app`, `routers`, `schemas`, `services`, `dependencies` y `config`. Adoptar esta estructura evita acoplar la recepción del request HTTP con las reglas de negocio o el acceso a la base de datos. En este proyecto eso es importante porque cambiar un transportista, un sistema de almacén o una regla de devoluciones no debería obligar a rehacer los endpoints.

## 5. Organización con Frontend y Backend Separados

- **Estructura del Repositorio:** Se utiliza un Monorepo con el frontend en `uis/` y el backend en `services/`, permitiendo compartir tipos e interfaces sin acoplar los despliegues.
- **Comunicación:** Protocolo HTTP/JSON (REST) para operaciones generales y Webhooks para eventos asíncronos provenientes de transportistas.
- **Contrato entre sistemas:** Frontend y backend evolucionan por separado, pero se integran mediante una API versionada y respuestas consistentes.
- **Variables de Entorno:** Toda la configuración sensible (`APP_ENV`, URLs de base de datos, credenciales de transportistas) se maneja externamente en archivos `.env`.
- **CORS:** Política restringida definiendo explícitamente los orígenes permitidos por entorno (Desarrollo, Staging, Producción), sin comodines abiertos.

## 6. Riesgos y Puntos de Atención

- **Acoplamiento de integraciones externas con reglas de negocio:** Escribir lógica de transportistas directamente en los routers acoplará la aplicación a proveedores específicos, imposibilitando las pruebas unitarias.
- **Distribución prematura en microservicios:** Separar el código en múltiples servicios antes de consolidar el dominio aumentará la complejidad de red e infraestructura sin resolver los problemas de integración.
- **Ausencia de contratos de API estrictos:** No validar las respuestas entre frontend y backend con Pydantic generará inconsistencias de datos y fallos en las interfaces de usuario.
