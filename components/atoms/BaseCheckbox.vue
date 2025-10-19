<template>
  <label class="base-checkbox">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="base-checkbox__checkmark"></span>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<style scoped>
.base-checkbox {
  display: inline-block;
  position: relative;
  cursor: pointer;
  user-select: none;
}

.base-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.base-checkbox__checkmark {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 50%;
  transition: all 0.2s ease;
  position: relative;
}

.base-checkbox:hover .base-checkbox__checkmark {
  border-color: #dc4c3e;
}

.base-checkbox input:checked ~ .base-checkbox__checkmark {
  background-color: #dc4c3e;
  border-color: #dc4c3e;
}

.base-checkbox input:checked ~ .base-checkbox__checkmark::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.base-checkbox input:disabled ~ .base-checkbox__checkmark {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
