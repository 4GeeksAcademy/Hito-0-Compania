// src/main.ts
import {} from "./types/models.js"; // <-- Corregido con 'type'
import { filtrarPorTransportista, ordenarPorCostoEnvio, } from "./utils/collections.js";
import { busquedaBinariaEnvio } from "./utils/search.js";
import { contarEnviosDevueltos, calcularCostoTotalEnvios, calcularPromedioPeso, obtenerEnvioMasCostoso, obtenerEnvioMenosCostoso, } from "./utils/transformations.js";
import { validarEnvio } from "./utils/validations.js";
const enviosPrueba = [
    {
        id: 1001,
        nombreCliente: "Ana Gomez",
        almacen: "Zaragoza",
        transportista: "UPS",
        pais: "Espana",
        estado: "En transito",
        peso: 12.5,
        costoEnvio: 34.9,
        devuelto: false,
    },
    {
        id: 1002,
        nombreCliente: "Carlos Mena",
        almacen: "Los Angeles",
        transportista: "MRW",
        pais: "Estados Unidos",
        estado: "Entregado",
        peso: 8.2,
        costoEnvio: 27.4,
        devuelto: false,
    },
    {
        id: 1003,
        nombreCliente: "Luisa Perez",
        almacen: "Zaragoza",
        transportista: "UPS",
        pais: "Espana",
        estado: "Devuelto",
        peso: 15.7,
        costoEnvio: 48.1,
        devuelto: true,
    },
    {
        id: 1004,
        nombreCliente: "Miguel Santos",
        almacen: "Los Angeles",
        transportista: "DHL",
        pais: "Estados Unidos",
        estado: "En almacen",
        peso: 5.6,
        costoEnvio: 19.99,
        devuelto: false,
    },
    {
        id: 1005,
        nombreCliente: "Paula Ruiz",
        almacen: "Madrid",
        transportista: "UPS",
        pais: "Espana",
        estado: "Entregado",
        peso: 21.3,
        costoEnvio: 55.2,
        devuelto: false,
    },
];
function formatearJsonLegible(valor) {
    return JSON.stringify(valor, null, 2);
}
function obtenerContenedorResultados() {
    const elemento = document.getElementById("resultados");
    if (elemento === null) {
        throw new Error("No se encontro el contenedor de resultados.");
    }
    return elemento;
}
function limpiarResultados() {
    const contenedor = obtenerContenedorResultados();
    contenedor.innerHTML = "";
}
function agregarTituloResultado(titulo) {
    const contenedor = obtenerContenedorResultados();
    const h3 = document.createElement("h3");
    h3.className = "mb-2 text-base font-semibold text-slate-800";
    h3.textContent = titulo;
    contenedor.appendChild(h3);
}
function agregarTextoResultado(texto) {
    const contenedor = obtenerContenedorResultados();
    const parrafo = document.createElement("p");
    parrafo.className = "mb-2 text-slate-700";
    parrafo.textContent = texto;
    contenedor.appendChild(parrafo);
}
function agregarBloqueJsonResultado(data) {
    const contenedor = obtenerContenedorResultados();
    const pre = document.createElement("pre");
    pre.className = "overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100";
    pre.textContent = formatearJsonLegible(data);
    contenedor.appendChild(pre);
}
function obtenerListaDatosPrueba() {
    const elemento = document.getElementById("lista-datos-prueba");
    if (elemento === null) {
        throw new Error("No se encontro la lista de datos de prueba.");
    }
    return elemento;
}
function crearTextoResumenEnvio(envio) {
    return ("ID " +
        envio.id +
        " | Cliente: " +
        envio.nombreCliente +
        " | Almacen: " +
        envio.almacen +
        " | Transportista: " +
        envio.transportista +
        " | Peso: " +
        envio.peso +
        " kg | Costo: $" +
        envio.costoEnvio +
        " | Devuelto: " +
        (envio.devuelto ? "Si" : "No"));
}
function renderizarDatosDePrueba() {
    const lista = obtenerListaDatosPrueba();
    lista.innerHTML = "";
    let indice = 0;
    while (indice < enviosPrueba.length) {
        const envioActual = enviosPrueba[indice];
        // Verificación de seguridad para calmar a TypeScript
        if (envioActual !== undefined) {
            const item = document.createElement("li");
            item.className = "rounded-md border border-slate-200 bg-white px-3 py-2";
            item.textContent = crearTextoResumenEnvio(envioActual);
            lista.appendChild(item);
        }
        indice = indice + 1;
    }
}
function validarDatosIniciales() {
    const errores = [];
    let indice = 0;
    while (indice < enviosPrueba.length) {
        const envioActual = enviosPrueba[indice];
        // Verificación de seguridad para calmar a TypeScript
        if (envioActual !== undefined) {
            const esValido = validarEnvio(envioActual);
            if (!esValido) {
                errores.push("El envio con ID " + envioActual.id + " no paso la validacion.");
            }
        }
        indice = indice + 1;
    }
    return errores;
}
function obtenerEnviosOrdenadosPorId() {
    const copia = enviosPrueba.slice();
    copia.sort(function (a, b) {
        return a.id - b.id;
    });
    return copia;
}
// Modifica esta función en tu main.ts
function manejarClickFiltrarDinamico() {
    const select = document.getElementById("select-transportista");
    if (select === null) {
        throw new Error("No se encontro el selector de transportistas.");
    }
    // Capturamos el valor que el usuario eligió (UPS, MRW o DHL)
    const transportistaSeleccionado = select.value;
    // Se lo pasamos a tu función original
    const resultado = filtrarPorTransportista(enviosPrueba, transportistaSeleccionado);
    limpiarResultados();
    agregarTituloResultado("Resultado: Filtrar por Transportista (" + transportistaSeleccionado + ")");
    agregarTextoResultado("Se encontraron " + resultado.length + " envios para " + transportistaSeleccionado + ".");
    agregarBloqueJsonResultado(resultado);
}
function manejarClickOrdenarPorCosto() {
    const resultado = ordenarPorCostoEnvio(enviosPrueba);
    limpiarResultados();
    agregarTituloResultado("Resultado: Ordenar por Costo");
    agregarTextoResultado("Listado ordenado de menor a mayor costo.");
    agregarBloqueJsonResultado(resultado);
}
function manejarClickCalcularReportes() {
    const totalDevueltos = contarEnviosDevueltos(enviosPrueba);
    const costoTotal = calcularCostoTotalEnvios(enviosPrueba);
    const promedioPeso = calcularPromedioPeso(enviosPrueba);
    const envioMasCostoso = obtenerEnvioMasCostoso(enviosPrueba);
    const envioMenosCostoso = obtenerEnvioMenosCostoso(enviosPrueba);
    const reporte = {
        totalEnvios: enviosPrueba.length,
        totalDevueltos: totalDevueltos,
        costoTotalEnvios: costoTotal,
        promedioPesoEnvios: promedioPeso,
        envioMasCostoso: envioMasCostoso,
        envioMenosCostoso: envioMenosCostoso,
    };
    limpiarResultados();
    agregarTituloResultado("Resultado: Reportes");
    agregarTextoResultado("Se calcularon totales, promedios y extremos de costo.");
    agregarBloqueJsonResultado(reporte);
}
function manejarClickBusquedaBinaria() {
    const input = document.getElementById("input-busqueda-id");
    if (input === null) {
        throw new Error("No se encontro el input de busqueda por ID.");
    }
    const valorEscrito = input.value.trim();
    if (valorEscrito === "") {
        limpiarResultados();
        agregarTituloResultado("Resultado: Busqueda Binaria");
        agregarTextoResultado("Debes escribir un ID numerico para buscar.");
        return;
    }
    const idBuscado = Number(valorEscrito);
    if (Number.isNaN(idBuscado)) {
        limpiarResultados();
        agregarTituloResultado("Resultado: Busqueda Binaria");
        agregarTextoResultado("El valor ingresado no es un numero valido.");
        return;
    }
    const enviosOrdenadosPorId = obtenerEnviosOrdenadosPorId();
    const resultado = busquedaBinariaEnvio(enviosOrdenadosPorId, idBuscado);
    limpiarResultados();
    agregarTituloResultado("Resultado: Busqueda Binaria");
    if (resultado === null) {
        agregarTextoResultado("No se encontro ningun envio con el ID " + idBuscado + ".");
        agregarBloqueJsonResultado(enviosOrdenadosPorId);
        return;
    }
    agregarTextoResultado("Envio encontrado para ID " + idBuscado + ".");
    agregarBloqueJsonResultado(resultado);
}
function conectarEventos() {
    const botonFiltrarDinamico = document.getElementById("btn-filtrar-dinamico");
    const botonOrdenarCosto = document.getElementById("btn-ordenar-costo");
    const botonCalcularReportes = document.getElementById("btn-calcular-reportes");
    const botonBusquedaBinaria = document.getElementById("btn-busqueda-binaria");
    if (botonFiltrarDinamico === null) {
        throw new Error("No se encontro el boton de filtrar por transportista.");
    }
    if (botonOrdenarCosto === null) {
        throw new Error("No se encontro el boton de ordenar por costo.");
    }
    if (botonCalcularReportes === null) {
        throw new Error("No se encontro el boton de calcular reportes.");
    }
    if (botonBusquedaBinaria === null) {
        throw new Error("No se encontro el boton de busqueda binaria.");
    }
    botonFiltrarDinamico.addEventListener("click", manejarClickFiltrarDinamico);
    botonOrdenarCosto.addEventListener("click", manejarClickOrdenarPorCosto);
    botonCalcularReportes.addEventListener("click", manejarClickCalcularReportes);
    botonBusquedaBinaria.addEventListener("click", manejarClickBusquedaBinaria);
}
function inicializarAplicacion() {
    renderizarDatosDePrueba();
    conectarEventos();
    const erroresValidacion = validarDatosIniciales();
    limpiarResultados();
    agregarTituloResultado("Estado inicial");
    if (erroresValidacion.length === 0) {
        agregarTextoResultado("Todos los envios de prueba son validos para iniciar las pruebas manuales.");
    }
    else {
        agregarTextoResultado("Se detectaron problemas de validacion en los datos iniciales.");
        agregarBloqueJsonResultado(erroresValidacion);
    }
}
document.addEventListener("DOMContentLoaded", inicializarAplicacion);
//# sourceMappingURL=main.js.map