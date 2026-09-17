/**
 * Tests para utilidades de autenticación.
 * Se enfoca en decodeTokenPayload, isTokenExpired, getTokenRemainingTime,
 * validatePassword, validateEmail y hashStringSHA256.
 */
import { describe, expect, test } from '@jest/globals';
import {
  decodeTokenPayload,
  isTokenExpired,
  getTokenRemainingTime,
  validatePassword,
  validateEmail,
  hashStringSHA256,
} from '../auth.js';

// Token JWT válido de prueba (payload: {"sub":"user-123","role":"admin","exp":9999999999})
const TOKEN_VALIDO = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyIsInJvbGUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.Xx-test-signature';

// Token con exp en el pasado (exp: 1000000000 ≈ 2001)
const TOKEN_EXPIRADO = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTAwMDAwMDAwMH0.Xx-test-signature';

describe('decodeTokenPayload', () => {
  test('camino feliz: decodifica payload de token válido', () => {
    const payload = decodeTokenPayload(TOKEN_VALIDO);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('user-123');
    expect(payload!.role).toBe('admin');
    expect(payload!.exp).toBe(9999999999);
  });

  test('modo fallo: token malformado sin puntos devuelve null', () => {
    expect(decodeTokenPayload('invalido')).toBeNull();
  });

  test('modo fallo: token con partes insuficientes devuelve null', () => {
    expect(decodeTokenPayload('solo.dos')).toBeNull();
  });

  test('modo fallo: string vacío devuelve null', () => {
    expect(decodeTokenPayload('')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  test('camino feliz: token con exp futuro no ha expirado', () => {
    expect(isTokenExpired(TOKEN_VALIDO)).toBe(false);
  });

  test('modo fallo: token con exp pasado ha expirado', () => {
    expect(isTokenExpired(TOKEN_EXPIRADO)).toBe(true);
  });

  test('caso límite: token inválido se considera expirado', () => {
    expect(isTokenExpired('token-invalido')).toBe(true);
  });
});

describe('getTokenRemainingTime', () => {
  test('camino feliz: token válido devuelve tiempo restante positivo', () => {
    const remaining = getTokenRemainingTime(TOKEN_VALIDO);
    // exp=9999999999, ahora ~1780000000, diff ~8220000000s
    expect(remaining).toBeGreaterThan(0);
  });

  test('modo fallo: token expirado devuelve 0', () => {
    const remaining = getTokenRemainingTime(TOKEN_EXPIRADO);
    expect(remaining).toBe(0);
  });

  test('caso límite: token inválido devuelve 0', () => {
    expect(getTokenRemainingTime('')).toBe(0);
  });
});

describe('validatePassword', () => {
  test('camino feliz: contraseña válida pasa todas las validaciones', () => {
    const result = validatePassword('Abcdefg1');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('modo fallo: contraseña demasiado corta', () => {
    const result = validatePassword('Ab1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('La contraseña debe tener al menos 8 caracteres');
  });

  test('modo fallo: contraseña sin mayúsculas', () => {
    const result = validatePassword('abcdefg1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('La contraseña debe contener al menos una mayúscula');
  });

  test('modo fallo: contraseña sin minúsculas', () => {
    const result = validatePassword('ABCDEFG1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('La contraseña debe contener al menos una minúscula');
  });

  test('modo fallo: contraseña sin números', () => {
    const result = validatePassword('Abcdefgh');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('La contraseña debe contener al menos un número');
  });

  test('caso límite: contraseña vacía', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });
});

describe('validateEmail', () => {
  test('camino feliz: email válido', () => {
    expect(validateEmail('usuario@example.com')).toBe(true);
  });

  test('camino feliz: email con subdominios', () => {
    expect(validateEmail('user@sub.example.co.uk')).toBe(true);
  });

  test('modo fallo: string vacío', () => {
    expect(validateEmail('')).toBe(false);
  });

  test('modo fallo: email sin @', () => {
    expect(validateEmail('usuarioexample.com')).toBe(false);
  });

  test('modo fallo: email sin dominio', () => {
    expect(validateEmail('usuario@')).toBe(false);
  });

  test('modo fallo: solo espacios', () => {
    expect(validateEmail('   ')).toBe(false);
  });
});

describe('hashStringSHA256', () => {
  test('camino feliz: genera hash SHA-256 de 64 caracteres hex', async () => {
    const hash = await hashStringSHA256('test-token');
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
  });

  test('mismo input produce mismo hash', async () => {
    const hash1 = await hashStringSHA256('mismo-valor');
    const hash2 = await hashStringSHA256('mismo-valor');
    expect(hash1).toBe(hash2);
  });

  test('distinto input produce distinto hash', async () => {
    const hash1 = await hashStringSHA256('valor-uno');
    const hash2 = await hashStringSHA256('valor-dos');
    expect(hash1).not.toBe(hash2);
  });

  test('caso límite: string vacío genera hash', async () => {
    const hash = await hashStringSHA256('');
    expect(hash).toHaveLength(64);
  });
});