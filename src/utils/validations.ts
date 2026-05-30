import { type Envio } from "../types/models.js";

export function validarEnvio(envio: Envio): boolean {

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