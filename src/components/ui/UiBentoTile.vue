<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { BentoSpan, RecordStatus } from './boardTypes'
import { RouterLink } from 'vue-router'

withDefaults(defineProps<{
  title: string
  value?: string
  subtitle?: string
  icon?: Component
  span?: BentoSpan
  tone?: 'surface' | 'muted' | 'brand'
  status?: RecordStatus
  thumbnail?: string
  to?: RouteLocationRaw
  action?: () => void
  disabled?: boolean
}>(), { span: 'small', tone: 'surface' })
</script>

<template>
  <component
    :is="to ? RouterLink : action ? 'button' : 'article'"
    :to="to"
    :type="action && !to ? 'button' : undefined"
    :disabled="action && !to ? disabled : undefined"
    class="bento__tile"
    :class="{ 'bento__tile--interactive': to || action }"
    :data-span="span"
    :data-tone="tone"
    @click="!disabled && action?.()"
  >
    <div class="bento__content">
      <span v-if="icon" class="bento__icon" aria-hidden="true"><component :is="icon" /></span>
      <h3 class="bento__title">
        {{ title }}
      </h3>
      <strong v-if="value" class="bento__value">{{ value }}</strong>
      <p v-if="subtitle" class="bento__subtitle">
        {{ subtitle }}
      </p>
      <span v-if="status" class="record__status" :data-tone="status.tone">{{ status.text }}</span>
      <slot />
    </div>
    <img v-if="thumbnail" class="bento__thumbnail" :src="thumbnail" alt="" loading="lazy">
  </component>
</template>
