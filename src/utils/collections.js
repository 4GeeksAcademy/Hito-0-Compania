import {} from "../types/models.js";
export function filtrarPorTransportista(envios, transportista) {
    const enviosFiltrados = envios.filter(function (envio) {
        return envio.transportista === transportista;
    });
    return enviosFiltrados;
}
export function filtrarPorEstado(envios, estado) {
    const enviosFiltrados = envios.filter(function (envio) {
        return envio.estado === estado;
    });
    return enviosFiltrados;
}
export function ordenarPorCostoEnvio(envios) {
    const copiaEnvios = envios.slice();
    const enviosOrdenados = copiaEnvios.sort(function (a, b) {
        return a.costoEnvio - b.costoEnvio;
    });
    return enviosOrdenados;
}
export function ordenarPorPeso(envios) {
    const copiaEnvios = envios.slice();
    const enviosOrdenados = copiaEnvios.sort(function (a, b) {
        return a.peso - b.peso;
    });
    return enviosOrdenados;
}
//# sourceMappingURL=collections.js.map