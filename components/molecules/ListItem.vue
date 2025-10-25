<template>
  <div
    :class="['list-item', { 'list-item--active': active }]"
    @click="$emit('select', list.id)"
  >
    <BaseIcon :name="list.icon" size="medium" :color="list.color" />
    <span class="list-item__name">{{ list.name }}</span>
    <span class="list-item__count">{{ taskCount }}</span>
    <button 
      class="list-item__delete"
      @click.stop="$emit('delete', list.id)"
      title="Delete list"
    >
      <BaseIcon name="trash" size="small" color="#999" />
    </button>
  </div>
</template>

<script setup lang="ts">
import BaseIcon from '../atoms/BaseIcon.vue';
import type { ListProjection } from '@/services/database';

defineProps<{
  list: ListProjection;
  taskCount: number;
  active: boolean;
}>();

defineEmits<{
  select: [id: string];
  delete: [id: string];
}>();
</script>

<style scoped>
.list-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-radius: 6px;
  margin-bottom: 0.25rem;
}

.list-item:hover {
  background-color: #f3f3f3;
}

.list-item--active {
  background-color: #feeeed;
}

.list-item__name {
  flex: 1;
  font-size: 0.9375rem;
  color: #202020;
  font-weight: 500;
}

.list-item__count {
  font-size: 0.8125rem;
  color: #666;
}

.list-item__delete {
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s ease, background-color 0.2s ease;
}

.list-item:hover .list-item__delete {
  opacity: 1;
}

.list-item__delete:hover {
  background-color: #feeeed;
}
</style>
