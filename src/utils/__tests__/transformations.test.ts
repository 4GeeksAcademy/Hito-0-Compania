import { contarEnviosDevueltos, calcularCostoTotalEnvios, calcularPromedioPeso, obtenerEnvioMasCostoso, obtenerEnvioMenosCostoso } from '../transformations.js';
import type { Envio } from '../../types/models.js';

const mockEnvios: Envio[] = [
  { id: 1, nombreCliente: 'Ana', almacen: 'Zaragoza', transportista: 'UPS', pais: 'Espana', estado: 'Devuelto', peso: 12.5, costoEnvio: 34.9, devuelto: true },
  { id: 2, nombreCliente: 'Carlos', almacen: 'Los Angeles', transportista: 'MRW', pais: 'Estados Unidos', estado: 'Entregado', peso: 8.2, costoEnvio: 27.4, devuelto: false },
  { id: 3, nombreCliente: 'Luisa', almacen: 'Zaragoza', transportista: 'UPS', pais: 'Espana', estado: 'Devuelto', peso: 15.7, costoEnvio: 48.1, devuelto: true },
];

describe('contarEnviosDevueltos', () => {
  test('camino feliz: cuenta correctamente los envios devueltos', () => {
    expect(contarEnviosDevueltos(mockEnvios)).toBe(2);
  });

  test('caso limite: array vacio devuelve 0', () => {
    expect(contarEnviosDevueltos([])).toBe(0);
  });

  test('caso limite: ningun envio devuelto', () => {
    const activos = mockEnvios.filter(e => !e.devuelto);
    expect(contarEnviosDevueltos(activos)).toBe(0);
  });
});

describe('calcularCostoTotalEnvios', () => {
  test('camino feliz: suma todos los costos correctamente', () => {
    const total = calcularCostoTotalEnvios(mockEnvios);
    expect(total).toBeCloseTo(34.9 + 27.4 + 48.1);
  });

  test('caso limite: array vacio devuelve 0', () => {
    expect(calcularCostoTotalEnvios([])).toBe(0);
  });
});

describe('calcularPromedioPeso', () => {
  test('camino feliz: calcula el promedio correctamente', () => {
    const promedio = calcularPromedioPeso(mockEnvios);
    expect(promedio).toBeCloseTo((12.5 + 8.2 + 15.7) / 3);
  });

  test('caso limite: array vacio devuelve 0', () => {
    expect(calcularPromedioPeso([])).toBe(0);
  });
});

describe('obtenerEnvioMasCostoso', () => {
  test('camino feliz: devuelve el envio con mayor costo', () => {
    const resultado = obtenerEnvioMasCostoso(mockEnvios);
    expect(resultado).not.toBeNull();
    expect(resultado!.costoEnvio).toBe(48.1);
    expect(resultado!.nombreCliente).toBe('Luisa');
  });

  test('caso limite: array vacio devuelve null', () => {
    expect(obtenerEnvioMasCostoso([])).toBeNull();
  });
});

describe('obtenerEnvioMenosCostoso', () => {
  test('camino feliz: devuelve el envio con menor costo', () => {
    const resultado = obtenerEnvioMenosCostoso(mockEnvios);
    expect(resultado).not.toBeNull();
    expect(resultado!.costoEnvio).toBe(27.4);
    expect(resultado!.nombreCliente).toBe('Carlos');
  });

  test('caso limite: array vacio devuelve null', () => {
    expect(obtenerEnvioMenosCostoso([])).toBeNull();
  });
});