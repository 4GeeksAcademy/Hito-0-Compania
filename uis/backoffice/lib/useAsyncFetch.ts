"use client";

import { useState, useEffect } from "react";

/**
 * useAsyncFetch — Custom Hook que encapsula el patrón
 * loading / error / data con cleanup de componente activo.
 *
 * Elimina la repetición del patrón `let active = true; ... return () => { active = false; }`
 * que aparece duplicado en cada página que consume datos de la API.
 *
 * @param fetchFn  Función asíncrona que retorna los datos a cargar.
 * @param initial  Valor inicial para el estado `data`.
 *
 * @example
 * const { data: products, loading, error } = useAsyncFetch(listProducts, []);
 *
 * {loading && <p>Cargando...</p>}
 * {error && <p role="alert">{error}</p>}
 * {!loading && !error && (data.length ? <Tabla /> : <Empty />)}
 */
export function useAsyncFetch<T>(
  fetchFn: () => Promise<T>,
  initial: T,
): {
  data: T;
  loading: boolean;
  error: string;
} {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetchFn()
      .then((items) => {
        if (active) setData(items);
      })
      .catch((failure: unknown) => {
        if (active) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Error al cargar los datos.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}