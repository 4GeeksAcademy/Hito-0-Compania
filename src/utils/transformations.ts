import { type Envio } from "../types/models.js";

export function contarEnviosDevueltos(envios: Envio[]): number {
    const listaDevueltos = envios.filter(function(envio) {
    return envio.devuelto === true; 
  });

  return listaDevueltos.length;
}

export function calcularCostoTotalEnvios(envios: Envio[]): number {
  const sumaTotal = envios.reduce(function(total, envio) {
    return total + envio.costoEnvio;
  }, 0);

  return sumaTotal;
}

export function calcularPromedioPeso(envios: Envio[]): number {
  if (envios.length === 0) {
    return 0;
  }

  const pesoTotal = envios.reduce(function(total, envio) {
    return total + envio.peso;
  }, 0);

  return pesoTotal / envios.length;
}

export function obtenerEnvioMasCostoso(envios: Envio[]): Envio | null {
  if (envios.length === 0) {
    return null;
  }

    const envioMaximo = envios.reduce(function(maximo, envio) {
    if (envio.costoEnvio > maximo.costoEnvio) {
      return envio; 
    } else {
      return maximo; 
    }
  });

  return envioMaximo;
}

export function obtenerEnvioMenosCostoso(envios: Envio[]): Envio | null {
  if (envios.length === 0) {
    return null;
  }

    const envioMinimo = envios.reduce(function(minimo, envio) {
    if (envio.costoEnvio < minimo.costoEnvio) {
      return envio; 
    } else {
      return minimo; 
    }
  });

  return envioMinimo;
}