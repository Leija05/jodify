module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)',
    '**/?(*.)+(spec|test).(ts|tsx)',
  ],
  transformIgnorePatterns: [
    // Agnostico de separador: en Windows las rutas usan '\' y los patrones
    // con '/' puro hacen que jest-expo NO transforme los paquetes TS crudos.
    'node_modules[\\\\/](?![^\\\\/]*(jest-|react-native|@react-native|@react-navigation|expo|@expo|zustand))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  testTimeout: 10000,
  clearMocks: true,
};
