module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    "eslint:recommended",
  ],
  rules: {
    "quotes": ["error", "single"],
    "object-curly-spacing": ["error", "always"],
    "no-unused-vars": ["warn"],
  },
};
