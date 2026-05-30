import {} from "../types/models.js";
export function validarEnvio(envio) {
    if (envio.nombreCliente.trim() === "") {
        return false;
    }
    if (envio.peso <= 0) {
        return false;
    }
    if (envio.costoEnvio < 0) {
        return false;
    }
    if (envio.transportista.trim() === "") {
        return false;
    }
    if (envio.estado.trim() === "") {
        return false;
    }
    return true;
}
//# sourceMappingURL=validations.js.map