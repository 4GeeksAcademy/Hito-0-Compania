import { validarEnvio } from '../validations.js';
import type { Envio } from '../../types/models.js';

const envioValido: Envio = {
  id: 1,
  nombreCliente: 'Ana Gomez',
  almacen: 'Zaragoza',
  transportista: 'UPS',
  pais: 'Espana',
  estado: 'En transito',
  peso: 12.5,
  costoEnvio: 34.9,
  devuelto: false,
};

describe('validarEnvio', () => {
  test('camino feliz: envio valido devuelve true', () => {
    expect(validarEnvio(envioValido)).toBe(true);
  });

  test('modo fallo: nombreCliente vacio devuelve false', () => {
    const invalido = { ...envioValido, nombreCliente: '  ' };
    expect(validarEnvio(invalido)).toBe(false);
  });

  test('modo fallo: peso <= 0 devuelve false', () => {
    expect(validarEnvio({ ...envioValido, peso: 0 })).toBe(false);
    expect(validarEnvio({ ...envioValido, peso: -1 })).toBe(false);
  });

  test('modo fallo: costoEnvio negativo devuelve false', () => {
    expect(validarEnvio({ ...envioValido, costoEnvio: -5 })).toBe(false);
  });

  test('modo fallo: transportista vacio devuelve false', () => {
    expect(validarEnvio({ ...envioValido, transportista: '' })).toBe(false);
  });

  test('modo fallo: estado vacio devuelve false', () => {
    expect(validarEnvio({ ...envioValido, estado: '' })).toBe(false);
  });
});