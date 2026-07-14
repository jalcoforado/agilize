import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';

export default [
  { ignores: ['dist/**'] },
  js.configs.recommended,
  reactPlugin.configs.flat.recommended,
  // v5.x (estável) cobre só rules-of-hooks + exhaustive-deps — v7.x trazia regras de
  // prontidão para o React Compiler (purity, set-state-in-effect etc.), que o projeto não usa.
  reactHooks.configs['recommended-latest'],
  security.configs.recommended,
  sonarjs.configs.recommended,
  {
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/no-danger': 'error',
      // Projeto nunca adotou PropTypes (pacote não é dependência direta, nenhum componente declara propTypes)
      // e não há TypeScript no frontend para substituir essa validação — regra desativada.
      'react/prop-types': 'off',
      // Todas as ocorrências revisadas são lookup em mapas internos de estilo/label por um valor
      // de estado conhecido (ex.: STATUS_CONFIG[status]) — não há chave vinda de entrada externa.
      'security/detect-object-injection': 'off',
      // Débito técnico: várias funções legadas passam de 15 (até 79). Refatorá-las agora, sem
      // suíte de testes de frontend, é risco de regressão em telas críticas. Limite temporário
      // até serem quebradas em partes menores com calma.
      'sonarjs/cognitive-complexity': ['warn', 80],
    },
  },
];
