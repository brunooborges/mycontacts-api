module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: 'airbnb-base',
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'class-methods-use-this': 'off',
    'consistent-return': 'off',
    'import/no-extraneous-dependencies': 'off',
    camelcase: 'off',
    'object-curly-newline': 'off',
    'no-confusing-arrow': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
  },
};
