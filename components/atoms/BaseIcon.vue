<template>
  <span :class="['base-icon', `base-icon--${size}`]" :style="{ color }">
    {{ iconMap[name] || iconMap.list }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}>();

const iconMap: Record<string, string> = {
  list: '📋',
  work: '💼',
  personal: '🏠',
  shopping: '🛒',
  health: '❤️',
  plus: '➕',
  trash: '🗑️',
  edit: '✏️',
  check: '✓',
  inbox: '📥',
  calendar: '📅',
  flag: '🚩',
  'arrow-left': '←'
};
</script>

<style scoped>
.base-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.base-icon--small {
  font-size: 1rem;
}

.base-icon--medium {
  font-size: 1.25rem;
}

.base-icon--large {
  font-size: 1.5rem;
}
</style>
