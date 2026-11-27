import nextVitals from 'eslint-config-next/core-web-vitals';

// Migrado de .eslintrc.json (ESLint 9, flat config). Mismas reglas que antes.
const config = [
  ...nextVitals,
  {
    ignores: ['.next/**', 'node_modules/**', 'apps/**', 'public/**', 'coverage/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      // Regla de pages/: en App Router los <a> a rutas internas son a propósito
      // (error boundaries, route handlers como /auth/google).
      '@next/next/no-html-link-for-pages': 'off',
      'no-console': 'warn',
      // Reglas nuevas de eslint-plugin-react-hooks 7: miden si el código está listo
      // para el React Compiler (no lo usamos). Marcan patrones que hoy funcionan;
      // quedan como aviso para cuando se encare, no frenan el lint.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
  {
    files: [
      'src/lib/**/*.ts',
      'src/app/api/**/*.ts',
      'src/hooks/**/*.ts',
      'src/app/**/error.tsx',
      'src/app/**/menu-data.ts',
      'src/app/**/opengraph-image.tsx',
      'src/components/menu/MenuImport.tsx',
      'src/components/public/MenuErrorBoundary.tsx',
    ],
    rules: { 'no-console': 'off' },
  },
];

export default config;
