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
    "/lib/**/*",    // Ignore built files.
    ".eslintrc.js", // Exclude .eslintrc.js from being linted
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "max-len": ["error", { "code": 120 }], 
    "object-curly-spacing": "off", 
    "@typescript-eslint/no-var-requires": "off", 
    "space-before-function-paren": "off", 
    "require-jsdoc": "off", 
    "no-undef": "off", 
    "indent": "off",
  }
};
