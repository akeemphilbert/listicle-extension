<template>
  <div
    :class="['list-item', { 'list-item--active': active }]"
    @click="$emit('select', list.id)"
  >
    <BaseIcon :name="list.icon" size="medium" :color="list.color" />
    <span class="list-item__name">{{ list.name }}</span>
    <span class="list-item__count">{{ taskCount }}</span>
  </div>
</template>

<script setup lang="ts">
import BaseIcon from '../atoms/BaseIcon.vue';
import type { Database } from '../../lib/types/database';

type List = Database['public']['Tables']['lists']['Row'];

defineProps<{
  list: List;
  taskCount: number;
  active: boolean;
}>();

defineEmits<{
  select: [id: string];
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
</style>
