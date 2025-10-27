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
          </div>
          <button 
            class="list-card__delete"
            @click.stop="$emit('delete-list', list.id)"
            title="Delete list"
          >
            🗑️
          </button>
          <div class="list-card__carat">›</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ListProjection } from '@/services/database';

const props = defineProps<{
  lists: ListProjection[];
}>();

defineEmits<{
  'select-list': [id: string];
  'delete-list': [id: string];
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
  position: relative;
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
  flex: 1;
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

.list-card__carat {
  font-size: 1.5rem;
  color: #999;
  margin-left: auto;
  flex-shrink: 0;
}

.list-card__delete {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s ease, background-color 0.2s ease;
  margin-right: 0.5rem;
  flex-shrink: 0;
}

.list-card:hover .list-card__delete {
  opacity: 1;
}

.list-card__delete:hover {
  background-color: #feeeed;
}
</style>
