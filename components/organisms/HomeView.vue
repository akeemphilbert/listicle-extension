<template>
  <div class="home-view">
    <div class="home-view__header">
      <h1 class="home-view__title">My Lists</h1>
    </div>

    <div class="home-view__content">
      <div class="home-view__lists">
        <div
          v-for="list in lists"
          :key="list.id"
          class="list-card"
          @click="$emit('select-list', list.id)"
        >
          <div class="list-card__icon">{{ getIcon(list.icon) }}</div>
          <div class="list-card__info">
            <h3 class="list-card__name">{{ list.name }}</h3>
            <p class="list-card__count">{{ getTaskCount(list.id) }} items</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { List } from '@/composables/useLists';

const props = defineProps<{
  lists: List[];
  taskCounts: Record<string, number>;
}>();

defineEmits<{
  'select-list': [id: string];
}>();

const iconMap: Record<string, string> = {
  list: '📋',
  work: '💼',
  personal: '🏠',
  shopping: '🛒',
  health: '❤️',
  inbox: '📥',
  calendar: '📅',
  flag: '🚩'
};

const getIcon = (name: string) => iconMap[name] || '📋';

const getTaskCount = (listId: string) => {
  return props.taskCounts[listId] || 0;
};
</script>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
}

.home-view__header {
  padding: 1rem 0.75rem 0.5rem 0.75rem;
}

.home-view__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #202020;
  margin: 0;
}

.home-view__content {
  flex: 1;
  overflow-y: auto;
  padding: 0 0.75rem 1rem 0.75rem;
}

.home-view__lists {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.list-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.list-card:hover {
  border-color: #db4c3f;
  box-shadow: 0 2px 8px rgba(219, 76, 63, 0.1);
}

.list-card__icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.list-card__info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.list-card__name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #202020;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-card__count {
  font-size: 0.8125rem;
  color: #666;
  margin: 0;
}
</style>
