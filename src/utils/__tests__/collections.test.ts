import { filtrarPorTransportista, filtrarPorEstado, ordenarPorCostoEnvio, ordenarPorPeso } from '../collections.js';
import type { Envio } from '../../types/models.js';

const mockEnvios: Envio[] = [
  { id: 1, nombreCliente: 'Ana', almacen: 'Zaragoza', transportista: 'UPS', pais: 'Espana', estado: 'En transito', peso: 12.5, costoEnvio: 34.9, devuelto: false },
  { id: 2, nombreCliente: 'Carlos', almacen: 'Los Angeles', transportista: 'MRW', pais: 'Estados Unidos', estado: 'Entregado', peso: 8.2, costoEnvio: 27.4, devuelto: false },
  { id: 3, nombreCliente: 'Luisa', almacen: 'Zaragoza', transportista: 'UPS', pais: 'Espana', estado: 'Devuelto', peso: 15.7, costoEnvio: 48.1, devuelto: true },
  { id: 4, nombreCliente: 'Miguel', almacen: 'Madrid', transportista: 'DHL', pais: 'Espana', estado: 'En almacen', peso: 5.6, costoEnvio: 19.99, devuelto: false },
];

describe('filtrarPorTransportista', () => {
  test('camino feliz: filtrar por UPS devuelve 2 envios', () => {
    const resultado = filtrarPorTransportista(mockEnvios, 'UPS');
    expect(resultado).toHaveLength(2);
    resultado.forEach(envio => expect(envio.transportista).toBe('UPS'));
  });

  test('modo fallo: filtrar por transportista inexistente devuelve array vacio', () => {
    const resultado = filtrarPorTransportista(mockEnvios, 'Ninguno');
    expect(resultado).toHaveLength(0);
  });

  test('caso limite: array vacio devuelve array vacio', () => {
    const resultado = filtrarPorTransportista([], 'UPS');
    expect(resultado).toHaveLength(0);
  });
});

describe('filtrarPorEstado', () => {
  test('camino feliz: filtrar por "Entregado" devuelve 1 envio', () => {
    const resultado = filtrarPorEstado(mockEnvios, 'Entregado');
    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.estado).toBe('Entregado');
  });

  test('modo fallo: filtrar por estado inexistente devuelve array vacio', () => {
    const resultado = filtrarPorEstado(mockEnvios, 'Extraviado');
    expect(resultado).toHaveLength(0);
  });
});

describe('ordenarPorCostoEnvio', () => {
  test('camino feliz: ordena de menor a mayor costo', () => {
    const resultado = ordenarPorCostoEnvio(mockEnvios);
    expect(resultado[0]!.costoEnvio).toBe(19.99);
    expect(resultado[3]!.costoEnvio).toBe(48.1);
    expect(resultado).toHaveLength(4);
  });

  test('no muta el array original', () => {
    const copia = [...mockEnvios];
    ordenarPorCostoEnvio(mockEnvios);
    expect(mockEnvios).toEqual(copia);
  });
});

describe('ordenarPorPeso', () => {
  test('camino feliz: ordena de menor a mayor peso', () => {
    const resultado = ordenarPorPeso(mockEnvios);
    expect(resultado[0]!.peso).toBe(5.6);
    expect(resultado[3]!.peso).toBe(15.7);
  });
});