<template>
  <input
    :class="['base-input', { 'base-input--error': error }]"
    :type="type"
    :placeholder="placeholder"
    :value="modelValue"
    :disabled="disabled"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    @keyup.enter="$emit('enter')"
  />
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  type?: string;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: string];
  enter: [];
}>();
</script>

<style scoped>
.base-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.base-input:focus {
  outline: none;
  border-color: #dc4c3e;
}

.base-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.base-input--error {
  border-color: #dc4c3e;
}

.base-input::placeholder {
  color: #999;
}
</style>
