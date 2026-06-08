import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  rules: {
    'no-console': 'warn',
    'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
  }
})
