<template>
  <div :class="['task-item', { 'task-item--completed': task.completed }]">
    <BaseCheckbox
      :model-value="task.completed"
      @update:model-value="$emit('toggle', task.id)"
    />
    <div class="task-item__content" @click="$emit('edit', task)">
      <div class="task-item__title">{{ task.title }}</div>
      <div v-if="task.description" class="task-item__description">{{ task.description }}</div>
      <div v-if="task.due_date" class="task-item__due-date">
        <BaseIcon name="calendar" size="small" />
        {{ formatDate(task.due_date) }}
      </div>
    </div>
    <div class="task-item__actions">
      <BaseButton
        variant="ghost"
        size="small"
        @click="$emit('delete', task.id)"
      >
        <BaseIcon name="trash" size="small" />
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseCheckbox from '@/components/atoms/BaseCheckbox.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import BaseIcon from '@/components/atoms/BaseIcon.vue';
import type { Task } from '@/composables/useTasks';

defineProps<{
  task: Task;
}>();

defineEmits<{
  toggle: [id: string];
  edit: [task: Task];
  delete: [id: string];
}>();

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};
</script>

<style scoped>
.task-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f3f3f3;
  transition: background-color 0.15s ease;
}

.task-item:hover {
  background-color: #f9f9f9;
}

.task-item__content {
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.task-item__title {
  font-size: 0.875rem;
  color: #202020;
  margin: 0;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-item--completed .task-item__title {
  text-decoration: line-through;
  color: #888;
}

.task-item__description {
  font-size: 0.75rem;
  color: #666;
  margin: 0.125rem 0 0 0;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-item__due-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  color: #db4c3f;
  margin-top: 0.125rem;
}

.task-item__actions {
  opacity: 0;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
}

.task-item:hover .task-item__actions {
  opacity: 1;
}
</style>
