<script setup lang="ts" generic="T extends string | number">
import type { Component } from 'vue'
import { NButton } from 'naive-ui'

withDefaults(defineProps<{
  options: { value: T, title: string, icon?: Component, badge?: number, disabled?: boolean }[]
  modelValue: T
  label?: string
}>(), { label: '筛选' })
defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <div class="filterbar" role="group" :aria-label="label">
    <NButton v-for="option in options" :key="option.value" class="filterbar__chip" :class="{ 'filterbar__chip--selected': modelValue === option.value }" :aria-pressed="modelValue === option.value" :disabled="option.disabled" round @click="$emit('update:modelValue', option.value)">
      <template v-if="option.icon" #icon>
        <component :is="option.icon" aria-hidden="true" />
      </template>
      {{ option.title }}<span v-if="option.badge !== undefined" class="filterbar__badge">{{ option.badge }}</span>
    </NButton>
    <slot />
  </div>
</template>
