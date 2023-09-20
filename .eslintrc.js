module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['tsconfig.json', 'tsconfig.dev.json'],
    sourceType: 'module',
  },
  ignorePatterns: [
    '/lib/**/*', // Ignore built files.
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    'quotes': ['error', 'single'], // Use single quotes
    'import/no-unresolved': 0,
    'indent': 'off',
    'object-curly-spacing': 'off',
  },
  overrides: [
    {
      files: ['.eslintrc.js'],
      rules: {
        'prettier/prettier': 'off', // Turn off Prettier for this file
      },
    },
    {
      files: ['**/*.js'], // Include all JavaScript files
      rules: {
        'indent': 'off', // Turn off the 'indent' rule for JavaScript files
        'object-curly-spacing': 'off',
      },
    },
  ],
};
