import { type Envio } from "../types/models.js";

export function busquedaLinealEnvio(envios: Envio[], id: number): Envio | null {
  for (let i = 0; i < envios.length; i++) {
    const envioActual = envios[i];

   if (envioActual !== undefined && envioActual.id === id) {
      return envioActual;
    }
  }
  return null;
}

export function busquedaBinariaEnvio(envios: Envio[], id: number): Envio | null {
  let inicio = 0;
  let final = envios.length - 1;

  while (inicio <= final) {
    const medio = Math.floor((inicio + final) / 2);
    const envioMedio = envios[medio]; 

    if (envioMedio !== undefined) {
      if (envioMedio.id === id) {
        return envioMedio;
      }

      if (envioMedio.id < id) {
        inicio = medio + 1;
      } else {
        final = medio - 1;
      }
    } else {
    }
  }

  return null;
}