<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

withDefaults(defineProps<{
  title: string
  subtitle?: string
  actionTitle?: string
  to?: RouteLocationRaw
  width?: 'compact' | 'regular' | 'feature'
}>(), { width: 'regular' })
defineEmits<{ action: [] }>()
</script>

<template>
  <section class="shelf" :data-width="width" :aria-label="title">
    <header class="shelf__header">
      <div>
        <h2>{{ title }}</h2><p v-if="subtitle">
          {{ subtitle }}
        </p>
      </div>
      <slot name="action">
        <component :is="to ? RouterLink : 'button'" v-if="actionTitle" :to="to" :type="to ? undefined : 'button'" class="shelf__action" @click="$emit('action')">
          {{ actionTitle }}
        </component>
      </slot>
    </header>
    <div class="shelf__track" tabindex="0" :aria-label="`${title}，横向浏览`">
      <slot />
    </div>
  </section>
</template>
