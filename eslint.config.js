import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.config.js', '**/*.config.ts', 'server/**', 'shared/**'],
  },
  js.configs.recommended,
  {
    files: ['client/src/**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        Date: 'readonly',
        Math: 'readonly',
        Promise: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        WebSocket: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        // DOM types
        HTMLElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        // Audio API
        AudioContext: 'readonly',
        AudioBuffer: 'readonly',
        GainNode: 'readonly',
        PannerNode: 'readonly',
        OscillatorNode: 'readonly',
        // WebXR
        XRSession: 'readonly',
        XRFrame: 'readonly',
        XRReferenceSpace: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-use-before-define': ['warn', {
        functions: false,
        classes: true,
        variables: true,
        allowNamedExports: false,
        ignoreTypeReferences: true,
      }],
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-use-before-define': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
