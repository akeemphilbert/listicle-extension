<template>
  <div class="task-list">
    <div class="task-list__header">
      <h1 class="task-list__title">{{ listName }}</h1>
    </div>

    <div class="task-list__items">
      <TaskItem
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @toggle="$emit('toggle-task', $event)"
        @edit="$emit('edit-task', $event)"
        @delete="$emit('delete-task', $event)"
        @view-recipe="handleViewRecipe"
      />

      <div v-if="tasks.length === 0" class="task-list__empty">
        <img
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Cpath fill='%23f4dede' d='M50 80c0-20 40-30 70-20s50 10 70 0 40-10 60 10v80H50z'/%3E%3Cellipse cx='150' cy='120' rx='50' ry='70' fill='%23d4a5a5'/%3E%3Ccircle cx='135' cy='110' r='3' fill='%23fff'/%3E%3Ccircle cx='165' cy='110' r='3' fill='%23fff'/%3E%3Cpath d='M140 125c5 5 15 5 20 0' stroke='%23fff' stroke-width='2' fill='none'/%3E%3Cpath fill='%23c48080' d='M100 100c-10-20-20-40-10-50s30 0 40 20z M200 100c10-20 20-40 10-50s-30 0-40 20z'/%3E%3Ccircle cx='250' cy='80' r='15' fill='%23db4c3f'/%3E%3Cpath d='M245 75l5 5m0-5l-5 5' stroke='%23fff' stroke-width='2'/%3E%3C/svg%3E"
          alt="Empty state"
          class="task-list__empty-img"
        />
      </div>
    </div>

    <AddTaskForm @click="$emit('add-task-click')" />
  </div>
</template>

<script setup lang="ts">
import TaskItem from '@/components/molecules/TaskItem.vue';
import AddTaskForm from '@/components/molecules/AddTaskForm.vue';
import type { Task } from '@/composables/useTasks';

defineProps<{
  listName: string;
  tasks: Task[];
}>();

const emit = defineEmits<{
  'add-task-click': [];
  'toggle-task': [id: string];
  'edit-task': [task: Task];
  'delete-task': [id: string];
  'view-recipe': [task: Task];
}>();

const handleViewRecipe = (task: Task) => {
  emit('view-recipe', task);
};
</script>

<style scoped>
.task-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
}

.task-list__header {
  padding: 1rem 0.75rem 0.5rem 0.75rem;
}

.task-list__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #202020;
  margin: 0;
}

.task-list__items {
  flex: 1;
  overflow-y: auto;
}

.task-list__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.task-list__empty-img {
  width: 150px;
  height: auto;
  opacity: 0.8;
}
</style>
