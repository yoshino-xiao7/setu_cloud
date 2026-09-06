<script setup lang="ts">
import type { RecordField, RecordStatus } from './boardTypes'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  headline: string
  supporting?: string
  status?: RecordStatus
  thumbnail?: string
  fields?: RecordField[]
  density?: 'regular' | 'compact'
  onActivate?: () => void
}>(), { fields: () => [], density: 'regular' })

const label = computed(() => [props.headline, props.supporting, ...props.fields.map(field => `${field.name} ${field.value}`), props.status?.text].filter(Boolean).join('，'))

function onKeydown(event: KeyboardEvent) {
  // Nested buttons keep their own keyboard/click behavior and never activate the card.
  if (!props.onActivate || event.target !== event.currentTarget || event.repeat)
    return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    props.onActivate()
  }
}

function onClick(event: MouseEvent) {
  if ((event.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]'))
    return
  props.onActivate?.()
}
</script>

<template>
  <article class="record" :class="{ 'record--interactive': onActivate }" :data-density="density" :data-tone="status?.tone ?? 'muted'" tabindex="0" :aria-label="label" @keydown="onKeydown" @click="onClick">
    <span class="record__ribbon" aria-hidden="true" />
    <header class="record__header">
      <img v-if="thumbnail" class="record__thumbnail" :src="thumbnail" alt="" loading="lazy">
      <div class="record__identity">
        <h3>{{ headline }}</h3><p v-if="supporting">
          {{ supporting }}
        </p>
      </div>
      <span v-if="status" class="record__status" :data-tone="status.tone">{{ status.text }}</span>
    </header>
    <slot />
    <dl v-if="fields.length" class="record__fields">
      <div v-for="(field, index) in fields" :key="index" class="record__field">
        <dt>{{ field.name }}</dt><dd :class="{ record__numeric: field.numeric !== false }">
          {{ field.value }}
        </dd>
      </div>
    </dl>
    <footer v-if="$slots.actions" class="record__actions">
      <slot name="actions" />
    </footer>
  </article>
</template>
