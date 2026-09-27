const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { ignores: ['node_modules/', 'dist/', '.expo/', '*.config.*', 'expo-env.d.ts', 'jest.setup.tsx'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      'react-hooks': require('eslint-plugin-react-hooks'),
      'testing-library': require('eslint-plugin-testing-library'),
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/require-await': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'testing-library/prefer-screen-queries': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
    settings: {
      react: { version: '18.3' },
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
  }
);