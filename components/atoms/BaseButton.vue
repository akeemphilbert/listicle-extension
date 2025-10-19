<template>
  <button
    :class="['base-button', `base-button--${variant}`, `base-button--${size}`]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}>();

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.base-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-button--small {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.base-button--medium {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
}

.base-button--large {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

.base-button--primary {
  background-color: #dc4c3e;
  color: white;
}

.base-button--primary:hover:not(:disabled) {
  background-color: #c53727;
}

.base-button--secondary {
  background-color: #f3f3f3;
  color: #202020;
}

.base-button--secondary:hover:not(:disabled) {
  background-color: #e8e8e8;
}

.base-button--ghost {
  background-color: transparent;
  color: #202020;
}

.base-button--ghost:hover:not(:disabled) {
  background-color: #f3f3f3;
}

.base-button--danger {
  background-color: #dc4c3e;
  color: white;
}

.base-button--danger:hover:not(:disabled) {
  background-color: #a83226;
}
</style>
