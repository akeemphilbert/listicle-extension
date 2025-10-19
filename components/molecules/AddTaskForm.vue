<template>
  <div class="add-task-form">
    <button class="add-task-form__btn" @click="$emit('click')">
      <span class="add-task-form__icon">+</span>
      <span class="add-task-form__text">Add item</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  click: [];
}>();
</script>

<style scoped>
.add-task-form {
  padding: 0.5rem 0.75rem;
}

.add-task-form__btn {
  background: none;
  border: none;
  color: #db4c3f;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  padding: 0.375rem;
  margin-left: -0.375rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.add-task-form__btn:hover {
  background-color: #f5f5f5;
}

.add-task-form__icon {
  font-size: 1rem;
  font-weight: 300;
}

.add-task-form__text {
  font-weight: 400;
}
</style>
