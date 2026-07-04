'use client';

import { createContext, useContext, useMemo, useState } from 'react';

export type LocationHub = 'Zaragoza' | 'Los Ángeles' | 'Todas';

type LocationContextValue = {
  location: LocationHub;
  setLocation: (next: LocationHub) => void;
};

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<LocationHub>('Todas');

  const value = useMemo(
    () => ({ location, setLocation }),
    [location],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);

  if (!context) {
    throw new Error('useLocation debe usarse dentro de LocationProvider');
  }

  return context;
}
