const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  { ignores: ['node_modules/', 'dist/', '.expo/', 'build/'] },
  expoConfig,
  eslintPluginPrettierRecommended,
  { rules: { 'prettier/prettier': 'error', 'no-console': ['warn', { allow: ['warn', 'error'] }] } },
]);
