## Empresa elegida
TrackFlow

## Por qué elegí esta empresa
He seleccionado TrackFlow como objeto de análisis porque represente el escenario ideal de un modelo negocio rentable (validado por sus ganancias anuales) pero que sufre una deuda técnica y operativa crítica. 

## Problema interesante del perfil
La empresa presenta diversos problemas que abarcan diferentes áreas, desde la distribución de mercadería hasta los reportes de dirección. A continuación, los detallo brevemente:
1) El sistema de gestión se encuentra dividido; el inventario de España y el de EE. UU. no están integrados. Ninguno puede ser consultado desde el otro país, lo que impide tener una visión general del estado global de la empresa.
2) La falta de un sistema de picking digital (actualmente se utiliza papel) genera retrasos y errores humanos constantes. 
3) Las consultas de los clientes se resuelven de forma manual, careciendo de automatización, lo que resulta en una pérdida de tiempo y valor estratégico.
4) El CEO toma decisiones basadas en datos con hasta 48 horas de antigüedad. La carencia de un sistema automatizado en tiempo real resta capacidad de reacción ante crisis críticas.

## Datos o flujos de trabajo que llaman la atención
En este punto destaco dos factores importantes:
1) Operar en dos continentes (Europa y América del Norte) ofrece una ventaja competitiva enorme, pero actualmente desaprovechada por la falta de integración.
2) El volumen de logística inversa (18% - 25%) es extremadamente alto, lo que genera gastos administrativos excesivos e insatisfacción en los clientes.

## Conexión con el porfolio o entrevistas
Tras el análisis de las problemáticas de TrackFlow, determino que este es el contexto perfecto para implementar soluciones de IA aplicada. El objetivo es demostrar cómo la Inteligencia Artificial es capaz de unificar operaciones internacionales, automatizar tareas repetitivas y mejorar la percepción del cliente mediante un sistema de resolución de problemas eficiente y eficaz.

## Departamentos que me interesan
- Departamento 1: Experiencia del cliente
El 80% de las consultas son repetitivas y requieren la atención de 15 agentes. Me interesa desarrollar un agente inteligente que no solo responda dudas, sino que se conecte con las APIs de los transportistas para ofrecer respuestas exactas en tiempo real sobre el estado del pedido.
- Departamento 2: Operaciones de Almacén
El problema central es la utilización de listas físicas en papel, lo que deriva en errores y pérdida de tiempo. La solución que planteo es diseñar un sistema de picking digital que garantice la trazabilidad total del producto.

## Reto de automatización elegido
Propongo un Sistema de Digitalización de Picking y Control de Inventario. Cada movimiento actualizará automáticamente el estado del pedido. Cuando el paquete llegue al transportista, se activará un evento en tiempo real que cambiará el estado a "en camino" al salir del depósito.
Complementariamente, implementaré un Agente de IA (Chatbot) que consulte directamente la base de datos de tracking. En caso de consultas complejas, el sistema derivará automáticamente el caso a un agente humano.


## Mi idea de Agente de IA
- Qué haría: Actuaría como un agente de interfaz y supervisión operativa. Sus funciones principales serían: resolver dudas de clientes y marcas mediante lenguaje natural, y supervisar el flujo del almacén en tiempo real para detectar anomalías.
- Qué información necesitaría: 
1) Inputs en tiempo real del sistema de picking digital y coordenadas de GPS de los transportistas.
2) Manuales de políticas de devolución, tiempos de entrega y preguntas frecuentes.
3) Historial de tiempos promedio de entrega por ruta para predecir posibles retrasos.
- Qué produciría o dispararía:
1) Para el cliente: Respuestas automáticas personalizadas sobre su paquete.
2) Para la operación: Alertas automáticas a los jefes de almacén ante anomalías en el flujo logístico.
3) Para atención al cliente: Creación de un ticket numerado cuando se detecte una consulta que requiera intervención humana.