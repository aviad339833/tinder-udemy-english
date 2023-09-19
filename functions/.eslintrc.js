module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    "project": "./tsconfig.json",
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "max-len": ["error", { "code": 120 }],  // allows line length up to 120 characters
    "object-curly-spacing": "off", // disables checking for spaces inside curly braces
    "@typescript-eslint/no-var-requires": "off", // allows using require statements in TypeScript
    "space-before-function-paren": "off", // disables checking for space before function parentheses
    "require-jsdoc": "off", // disables the need for JSDoc comments
    "no-undef": "off", // turn off checking for undefined variables (use this with caution!)
    "indent": "off", // turn off indentation checks
}

};
