module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['dist', 'node_modules', 'scratch'],
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
  },
  overrides: [
    {
      // Skrip Node, berkas konfigurasi, dan unit test berjalan di Node.
      files: ['*.cjs', 'scripts/**/*.{js,mjs}', '*.config.js', 'src/**/*.test.{js,jsx}'],
      env: { node: true },
    },
  ],
};
