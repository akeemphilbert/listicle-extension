<template>
  <div class="sidebar">
    <div class="sidebar__header">
      <h1 class="sidebar__title">Tasks</h1>
    </div>

    <div class="sidebar__lists">
      <ListItem
        v-for="list in lists"
        :key="list.id"
        :list="list"
        :task-count="getTaskCount(list.id)"
        :active="selectedListId === list.id"
        @select="$emit('select-list', $event)"
        @delete="$emit('delete-list', $event)"
      />
    </div>

    <div class="sidebar__footer">
      <BaseButton
        variant="ghost"
        size="small"
        @click="$emit('add-list')"
      >
        <BaseIcon name="plus" size="small" />
        Add List
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import ListItem from '../molecules/ListItem.vue';
import BaseButton from '../atoms/BaseButton.vue';
import BaseIcon from '../atoms/BaseIcon.vue';
import type { ListProjection } from '../../stores/listsStore';

const props = defineProps<{
  lists: ListProjection[];
  selectedListId: string | null;
  taskCounts: Record<string, number>;
}>();

defineEmits<{
  'select-list': [id: string];
  'add-list': [];
  'delete-list': [id: string];
}>();

const getTaskCount = (listId: string) => {
  return props.taskCounts[listId] || 0;
};
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 280px;
  height: 100%;
  background-color: #fafafa;
  border-right: 1px solid #e8e8e8;
}

.sidebar__header {
  padding: 1.5rem 1rem 1rem;
  border-bottom: 1px solid #e8e8e8;
}

.sidebar__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #202020;
  margin: 0;
}

.sidebar__lists {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.sidebar__footer {
  padding: 1rem;
  border-top: 1px solid #e8e8e8;
}
</style>
