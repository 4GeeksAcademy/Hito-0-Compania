import { busquedaLinealEnvio, busquedaBinariaEnvio } from '../search.js';
import type { Envio } from '../../types/models.js';

const mockEnvios: Envio[] = [
  { id: 1, nombreCliente: 'Ana', almacen: 'Zaragoza', transportista: 'UPS', pais: 'Espana', estado: 'En transito', peso: 12.5, costoEnvio: 34.9, devuelto: false },
  { id: 2, nombreCliente: 'Carlos', almacen: 'Los Angeles', transportista: 'MRW', pais: 'Estados Unidos', estado: 'Entregado', peso: 8.2, costoEnvio: 27.4, devuelto: false },
  { id: 3, nombreCliente: 'Luisa', almacen: 'Zaragoza', transportista: 'UPS', pais: 'Espana', estado: 'Devuelto', peso: 15.7, costoEnvio: 48.1, devuelto: true },
];

describe('busquedaLinealEnvio', () => {
  test('camino feliz: encuentra envio por id existente', () => {
    const resultado = busquedaLinealEnvio(mockEnvios, 2);
    expect(resultado).not.toBeNull();
    expect(resultado!.nombreCliente).toBe('Carlos');
  });

  test('modo fallo: id inexistente devuelve null', () => {
    const resultado = busquedaLinealEnvio(mockEnvios, 999);
    expect(resultado).toBeNull();
  });

  test('caso limite: array vacio devuelve null', () => {
    const resultado = busquedaLinealEnvio([], 1);
    expect(resultado).toBeNull();
  });
});

describe('busquedaBinariaEnvio', () => {
  test('camino feliz: encuentra envio por id existente (array ordenado por id)', () => {
    const resultado = busquedaBinariaEnvio(mockEnvios, 1);
    expect(resultado).not.toBeNull();
    expect(resultado!.nombreCliente).toBe('Ana');
  });

  test('modo fallo: id inexistente devuelve null', () => {
    const resultado = busquedaBinariaEnvio(mockEnvios, 999);
    expect(resultado).toBeNull();
  });

  test('caso limite: array vacio devuelve null', () => {
    const resultado = busquedaBinariaEnvio([], 1);
    expect(resultado).toBeNull();
  });
});