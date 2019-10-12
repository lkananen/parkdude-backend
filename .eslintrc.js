module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['plugin:@typescript-eslint/recommended', 'eslint:recommended', 'plugin:node/recommended', 'google'],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  env: {
    jest: true
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-use-before-define': ["error", { "functions": false }],
    'comma-dangle': 'off',
    'max-len': ['error', { code: 120 }],
    'new-cap': 'off',
    'no-console': 'off',
    'no-unused-vars': 'off',
    // Disabled because it doesn't detect all TypeScript imports correctly
    'node/no-missing-import': 'off',
    'node/no-unsupported-features/es-syntax': 'off',
    'node/shebang': 'off',
    'require-jsdoc': 'off',
    'valid-jsdoc': 'off',
    indent: ['error', 2]
  }
};
