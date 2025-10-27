<template>
  <div class="app">
    <Header
        @home="showHome"
        @add="showAddListModal = true"
    />

    <div class="app__content">
      <HomeView
          v-if="currentView === 'home'"
          :lists="activeListsArray"
          @select-list="handleSelectList"
          @delete-list="handleDeleteList"
      />

      <TaskList
          v-else-if="selectedList && currentView === 'list'"
          :list-name="selectedList.name"
          :tasks="tasks"
          @add-task-click="showAddItemModal = true"
          @toggle-task="toggleTask"
          @delete-task="deleteTask"
          @view-recipe="handleViewRecipe"
      />

      <RecipeDetail
          v-else-if="selectedRecipe && currentView === 'recipe'"
          :task="selectedRecipe"
          @close="handleCloseRecipe"
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
        <div class="modal__content">
          <h2 class="modal__title">Create New List</h2>
          <input
              v-model="newListName"
              type="text"
              placeholder="List name"
              class="modal__input"
              @keyup.enter="handleAddList"
              ref="listInput"
          />
          <textarea
              v-model="newListDescription"
              placeholder="List description (optional)"
              class="modal__textarea"
              rows="3"
          ></textarea>
          <div class="modal__actions">
            <button class="modal__btn modal__btn--primary" @click="handleAddList">Create list</button>
            <button class="modal__btn" @click="showAddListModal = false">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import Header from '@/components/organisms/Header.vue';
import HomeView from '@/components/organisms/HomeView.vue';
import TaskList from '@/components/organisms/TaskList.vue';
import RecipeDetail from '@/components/organisms/RecipeDetail.vue';
import { useEventStore } from '@/stores/eventStore';
import { listService } from '@/services/listService';
import { itemService } from '@/services/itemService';
import { db, type ListProjection } from '@/services/database';
import { useTasks, type Task } from '@/composables/useTasks';

// Direct database access with hooks
const activeListsArray = ref<ListProjection[]>([]);

// Store references - will be initialized in onMounted
let eventStore: any = null;

// Database refresh function
const refreshLists = async () => {
  activeListsArray.value = await db.listProjections.toArray();
  console.log(`📋 Loaded ${activeListsArray.value.length} lists:`, activeListsArray.value.map(l => l.name));
};

// Setup database hooks for automatic updates
const setupDatabaseHooks = () => {
  console.log('Setting up database hooks...');
  
  // Set up hooks for all operations
  db.listProjections.hook('creating', () => {
    console.log('List created hook triggered');
    nextTick(() => refreshLists());
  });
  
  db.listProjections.hook('updating', () => {
    console.log('List updated hook triggered');
    nextTick(() => refreshLists());
  });
  
  db.listProjections.hook('deleting', () => {
    console.log('List deleted hook triggered');
    nextTick(() => refreshLists());
  });
  
  
  console.log('Database hooks set up successfully');
};

// Initialize services and load data
onMounted(async () => {
  // Initialize stores first
  eventStore = useEventStore();
  
  // Check and recreate database if needed
  await db.checkAndRecreateIfNeeded();
  
  await listService.initialize();
  await eventStore.initialize();
  
  // Load initial data and setup hooks
  await refreshLists();
  setupDatabaseHooks();
});

// Cleanup on unmount
onUnmounted(() => {
  // No cleanup needed for the new approach
});

const selectedListId = ref<string | null>(null);
const currentView = ref<'home' | 'list' | 'recipe'>('home');
const { tasks, createTask, toggleTask, deleteTask } = useTasks(selectedListId);
const showAddItemModal = ref(false);
const showAddListModal = ref(false);
const newItemTitle = ref('');
const newListName = ref('');
const newListDescription = ref('');
const itemInput = ref<HTMLInputElement | null>(null);
const listInput = ref<HTMLInputElement | null>(null);
const selectedRecipe = ref<Task | null>(null);
const selectedList = computed(() => {
  return activeListsArray.value.find(list => list.id === selectedListId.value) || null;
});

const showHome = () => {
  currentView.value = 'home';
  selectedListId.value = null;
};

const handleSelectList = (id: string) => {
  selectedListId.value = id;
  currentView.value = 'list';
};

const handleViewRecipe = (task: Task) => {
  selectedRecipe.value = task;
  currentView.value = 'recipe';
};

const handleCloseRecipe = () => {
  currentView.value = 'list';
  selectedRecipe.value = null;
};

const handleDeleteList = async (listId: string) => {
  if (confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
    console.log('Deleting list:', listId);
    
    // Debug: Check if list exists in projections
    const listExists = activeListsArray.value.find(l => l.id === listId);
    console.log('List exists in projections:', listExists);
    
    // Debug: Check if events exist for this list
    const events = await eventStore.getEventsByAggregateId(listId);
    console.log('Events for list:', events);
    
    const success = await listService.deleteList(listId);
    console.log('Delete result:', success);
    
    if (success) {
      console.log('List deleted successfully');
      // Manual refresh as fallback in case hooks don't fire
      await refreshLists();
      
      // If we deleted the currently selected list, go back to home
      if (selectedListId.value === listId) {
        selectedListId.value = null;
        currentView.value = 'home';
      }
    } else {
      console.error('Failed to delete list');
      alert('Failed to delete list. Please try again.');
    }
  }
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

  const newList = await listService.createList(
    newListName.value,
    'list',
    '#808080',
    newListDescription.value.trim() || undefined
  );

  newListName.value = '';
  newListDescription.value = '';
  showAddListModal.value = false;

  if (newList) {
    // Wait for the projection to update
    await nextTick();
    const projection = activeListsArray.value.find(l => l.id === newList.id);
    if (projection) {
      handleSelectList(projection.id);
    }
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

watch(activeListsArray, async () => {
  if (activeListsArray.value.length > 0 && !selectedListId.value && currentView.value === 'list') {
    selectedListId.value = activeListsArray.value[0].id;
  }
}, { immediate: true });
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 500px;
  width: 400px;
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
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 8px;
  padding: 0;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal__content {
  padding: 2rem;
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
  box-sizing: border-box;
}

.modal__input:focus {
  outline: none;
  border-color: #db4c3f;
}

.modal__textarea {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 1rem;
  margin-bottom: 1rem;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
  box-sizing: border-box;
}

.modal__textarea:focus {
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
