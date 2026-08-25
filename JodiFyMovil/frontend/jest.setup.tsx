// Setup global para Jest/jest-expo.
// jest-expo ya mockea los módulos nativos de Expo; aquí solo silenciamos
// warnings ruidosos y proveemos mocks que la suite necesita explícitamente.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Sistema de archivos: API orientada a objetos (Directory/File/Paths) que no
// existe en Node. Se simula con clases inertes suficientes para los stores.
jest.mock('expo-file-system', () => {
  class MockEntry {
    uri: string;
    exists = false;
    constructor(...parts: (string | MockEntry)[]) {
      this.uri = ['file://', ...parts].join('/');
    }
    async create() {}
    async delete() {}
    async move() {}
    async copy() {}
  }
  class MockDirectory extends MockEntry {
    list() { return []; }
  }
  class MockFile extends MockEntry {
    async text() { return ''; }
    async write() {}
    bytes(): Uint8Array { return new Uint8Array(); }
  }
  return {
    __esModule: true,
    Directory: MockDirectory,
    File: MockFile,
    Paths: {
      document: 'file:///documents',
      cache: 'file:///cache',
      temporary: 'file:///tmp',
      bundle: 'file:///bundle',
    },
  };
});

const originalError = console.error;
console.error = (...args: unknown[]) => {
  const first = String(args[0] ?? '');
  if (first.includes('Warning:') || first.includes('act(') || first.includes('test was not wrapped')) {
    return;
  }
  originalError(...args);
};
