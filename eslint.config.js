import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  ignores: ['docs/**', 'public/**', 'dist/**'],
  rules: {
    'no-console': 'warn',
    'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
    'style/comma-dangle': 'off',
    'style/quote-props': 'off',
  }
})
