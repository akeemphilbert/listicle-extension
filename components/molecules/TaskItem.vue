<template>
  <div :class="['task-item', { 'task-item--completed': task.completed }]">
    <div class="task-item__type-icon">
      <span v-if="isRecipe">🍳</span>
    </div>
    <div class="task-item__content" @click="$emit('edit', task)">
      <div class="task-item__title">{{ task.title }}</div>
      <div v-if="task.description" class="task-item__description">{{ task.description }}</div>
      <div v-if="task.due_date" class="task-item__due-date">
        <BaseIcon name="calendar" size="small" />
        {{ formatDate(task.due_date) }}
      </div>
    </div>
    <div class="task-item__actions">
      <button 
        v-if="task.url" 
        class="task-item__action-btn" 
        @click.stop="openUrl"
        title="Open original URL"
      >
        🔗
      </button>
      <button 
        v-if="isRecipe" 
        class="task-item__action-btn" 
        @click.stop="$emit('view-recipe', task)"
        title="View recipe"
      >
        👁️
      </button>
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
import { computed } from 'vue';

const props = defineProps<{
  task: Task;
}>();

defineEmits<{
  toggle: [id: string];
  edit: [task: Task];
  delete: [id: string];
  'view-recipe': [task: Task];
}>();

const isRecipe = computed(() => {
  return props.task.type === 'Recipe' || 
         (props.task.jsonLd && props.task.jsonLd['@type'] === 'Recipe');
});

const openUrl = () => {
  if (props.task.url) {
    browser.tabs.create({ url: props.task.url });
  }
};

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

.task-item__type-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  width: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
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
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.task-item:hover .task-item__actions {
  opacity: 1;
}

.task-item__action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  font-size: 1rem;
  transition: background-color 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-item__action-btn:hover {
  background-color: #f5f5f5;
}
</style>
