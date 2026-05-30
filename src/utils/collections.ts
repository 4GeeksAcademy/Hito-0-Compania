import { type Envio } from "../types/models.js";

export function filtrarPorTransportista(envios: Envio[], transportista: string): Envio[] {

  const enviosFiltrados = envios.filter(function(envio) {

    return envio.transportista === transportista;

  });

  return enviosFiltrados;
}

export function filtrarPorEstado(envios: Envio[],estado: string): Envio[] {

  const enviosFiltrados = envios.filter(function(envio) {

    return envio.estado === estado;

  });

  return enviosFiltrados;
}

export function ordenarPorCostoEnvio(envios: Envio[]): Envio[] {

  const copiaEnvios = envios.slice()

const enviosOrdenados = copiaEnvios.sort(function(a, b) {
    return a.costoEnvio - b.costoEnvio;

  });

  return enviosOrdenados;
}

export function ordenarPorPeso(envios: Envio[]): Envio[] {

    const copiaEnvios = envios.slice();

    const enviosOrdenados = copiaEnvios.sort(function(a, b) {
    return a.peso - b.peso;
  });

  return enviosOrdenados;
}