// Mock localStorage antes de que se importe cualquier módulo
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Mock window.location
Object.defineProperty(globalThis, 'window', {
  value: {
    location: { href: 'http://localhost:3000/', hostname: 'localhost', protocol: 'http:' },
  },
  writable: true,
  configurable: true,
});