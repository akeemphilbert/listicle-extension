<template>
  <div class="app">
    <Header
        @home="showHome"
        @add="showAddListModal = true"
    />

    <div class="app__content">
      <HomeView
          v-if="currentView === 'home'"
          :lists="lists"
          :task-counts="taskCounts"
          @select-list="handleSelectList"
      />

      <TaskList
          v-else-if="selectedList"
          :list-name="selectedList.name"
          :tasks="tasks"
          @add-task-click="showAddItemModal = true"
          @toggle-task="toggleTask"
          @delete-task="deleteTask"
      />
    </div>

    <div v-if="showAddItemModal" class="modal-overlay" @click="showAddItemModal = false">
      <div class="modal" @click.stop>
        <input
            v-model="newItemTitle"
            type="text"
            placeholder="Item name"
            class="modal__input"
            @keyup.enter="handleAddItem"
            ref="itemInput"
        />
        <div class="modal__actions">
          <button class="modal__btn modal__btn--primary" @click="handleAddItem">Add item</button>
          <button class="modal__btn" @click="showAddItemModal = false">Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="showAddListModal" class="modal-overlay" @click="showAddListModal = false">
      <div class="modal" @click.stop>
        <h2 class="modal__title">Create New List</h2>
        <input
            v-model="newListName"
            type="text"
            placeholder="List name"
            class="modal__input"
            @keyup.enter="handleAddList"
            ref="listInput"
        />
        <div class="modal__actions">
          <button class="modal__btn modal__btn--primary" @click="handleAddList">Create list</button>
          <button class="modal__btn" @click="showAddListModal = false">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import Header from '@/components/organisms/Header.vue';
import HomeView from '@/components/organisms/HomeView.vue';
import TaskList from '@/components/organisms/TaskList.vue';
import { useLists } from '@/composables/useLists';
import { useTasks } from '@/composables/useTasks';

const { lists, createList } = useLists();
const selectedListId = ref<string | null>(null);
const currentView = ref<'home' | 'list'>('home');
const { tasks, createTask, toggleTask, deleteTask } = useTasks(selectedListId);
const showAddItemModal = ref(false);
const showAddListModal = ref(false);
const newItemTitle = ref('');
const newListName = ref('');
const itemInput = ref<HTMLInputElement | null>(null);
const listInput = ref<HTMLInputElement | null>(null);

const selectedList = computed(() => {
  return lists.value.find(list => list.id === selectedListId.value) || null;
});

const taskCounts = computed(() => {
  const counts: Record<string, number> = {};
  lists.value.forEach(list => {
    counts[list.id] = 0;
  });
  return counts;
});

const showHome = () => {
  currentView.value = 'home';
  selectedListId.value = null;
};

const handleSelectList = (id: string) => {
  selectedListId.value = id;
  currentView.value = 'list';
};

const handleAddItem = async () => {
  if (!selectedListId.value || !newItemTitle.value.trim()) return;

  await createTask({
    list_id: selectedListId.value,
    title: newItemTitle.value
  });

  newItemTitle.value = '';
  showAddItemModal.value = false;
};

const handleAddList = async () => {
  if (!newListName.value.trim()) return;

  const newList = await createList({
    name: newListName.value,
    icon: 'list',
    color: '#808080'
  });

  newListName.value = '';
  showAddListModal.value = false;

  if (newList) {
    handleSelectList(newList.id);
  }
};

watch(showAddItemModal, async (show) => {
  if (show) {
    await nextTick();
    itemInput.value?.focus();
  }
});

watch(showAddListModal, async (show) => {
  if (show) {
    await nextTick();
    listInput.value?.focus();
  }
});

watch(lists, async () => {
  if (lists.value.length === 0) {
    await createList({ name: 'Inbox', icon: 'inbox', color: '#4073ff' });
  }
  if (lists.value.length > 0 && !selectedListId.value && currentView.value === 'list') {
    selectedListId.value = lists.value[0].id;
  }
}, { immediate: true });
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  overflow: hidden;
  padding: 0;
}

.app__content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app__welcome {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 1rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  width: 500px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #202020;
  margin: 0 0 1rem 0;
}

.modal__input {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 1rem;
  margin-bottom: 1rem;
  font-family: inherit;
}

.modal__input:focus {
  outline: none;
  border-color: #db4c3f;
}

.modal__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.modal__btn {
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9375rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  background-color: #f3f3f3;
  color: #202020;
}

.modal__btn:hover {
  background-color: #e8e8e8;
}

.modal__btn--primary {
  background-color: #db4c3f;
  color: white;
}

.modal__btn--primary:hover {
  background-color: #c53727;
}
</style>
