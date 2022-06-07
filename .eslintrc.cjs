/**
 * @type {import('eslint').Linter.Config}
 * @see https://eslint.org/docs/user-guide/configuring/
 */
const config = {
  extends: '@lightwing',
  overrides: [
    {
      files: ['packages/create-doubleshot/index.js', 'packages/runner/**/*.ts', 'packages/builder/**/*.ts'],
      rules: {
        'no-console': 'off'
      }
    },
    {
      files: ['packages/builder/**/*.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ],
}

module.exports = config
