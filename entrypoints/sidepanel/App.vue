<template>
  <div class="app">
    <Header
        @home="showHome"
        @add="showAddListModal = true"
        @settings="showSettings"
    />

    <div class="app__content">
      <HomeView
          v-if="currentView === 'home'"
          :lists="activeListsArray"
          :task-counts="taskCounts"
          @select-list="handleSelectList"
      />

      <TaskList
          v-else-if="currentView === 'list' && selectedList"
          :list-name="selectedList.name"
          :tasks="tasks"
          @add-task-click="showAddItemModal = true"
          @toggle-task="toggleTask"
          @delete-task="deleteTask"
      />

      <Settings
          v-else-if="currentView === 'settings'"
      />
    </div>

    <!-- Scanned Items Panel -->
    <div v-if="showScannedItems && scannedItems.length > 0" class="scanned-items-panel">
      <div class="scanned-items__header">
        <h3 class="scanned-items__title">📝 Scanned Items</h3>
        <button @click="dismissScannedItems" class="scanned-items__dismiss">×</button>
      </div>
      
      <div class="scanned-items__list">
        <div 
          v-for="item in scannedItems" 
          :key="item.title"
          class="scanned-item"
        >
          <div class="scanned-item__content">
            <div class="scanned-item__title">{{ item.title }}</div>
            <div v-if="item.description" class="scanned-item__description">{{ item.description }}</div>
            <div class="scanned-item__meta">
              <span class="scanned-item__confidence">{{ Math.round(item.confidence * 100) }}%</span>
              <span class="scanned-item__type">{{ item.type }}</span>
            </div>
          </div>
          <button 
            @click="addScannedItem(item)"
            class="scanned-item__add-btn"
            :disabled="!selectedListId"
          >
            Add
          </button>
        </div>
      </div>
      
      <div class="scanned-items__actions">
        <button 
          @click="addAllScannedItems"
          class="scanned-items__add-all"
          :disabled="!selectedListId"
        >
          Add All to {{ selectedList?.name || 'List' }}
        </button>
      </div>
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
import Settings from '@/components/organisms/Settings.vue';
import { useEventStore } from '@/stores/eventStore';
import { listService } from '@/services/listService';
import { itemService } from '@/services/itemService';
import { db, type ListProjection } from '@/services/database';
import { useTasks } from '@/composables/useTasks';
import { messaging } from '@/utils/messaging';
import { ScannedItem } from '@/services/userPreferences';

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
  
  // Set up hooks for item operations (to update list counts)
  db.itemProjections.hook('creating', async () => {
    console.log('Item created hook triggered');
    await nextTick();
    await updateTaskCounts(); // Update task counts directly
  });
  
  db.itemProjections.hook('updating', async () => {
    console.log('Item updated hook triggered');
    await nextTick();
    await updateTaskCounts(); // Update task counts directly
  });
  
  db.itemProjections.hook('deleting', async () => {
    console.log('Item deleted hook triggered');
    await nextTick();
    await updateTaskCounts(); // Update task counts directly
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
const currentView = ref<'home' | 'list' | 'settings'>('home');
const { tasks, createTask, toggleTask, deleteTask } = useTasks(selectedListId);
const showAddItemModal = ref(false);
const showAddListModal = ref(false);
const newItemTitle = ref('');
const newListName = ref('');
const newListDescription = ref('');
const itemInput = ref<HTMLInputElement | null>(null);
const listInput = ref<HTMLInputElement | null>(null);
const scannedItems = ref<ScannedItem[]>([]);
const showScannedItems = ref(false);

const selectedList = computed(() => {
  return activeListsArray.value.find(list => list.id === selectedListId.value) || null;
});

const taskCounts = ref<Record<string, number>>({});

// Function to update task counts
const updateTaskCounts = async () => {
  const counts: Record<string, number> = {};
  
  // Count items for each list
  for (const list of activeListsArray.value) {
    try {
      const items = await itemService.getItemsForList(list.id);
      counts[list.id] = items.length;
    } catch (error) {
      console.error(`Error getting items for list ${list.id}:`, error);
      counts[list.id] = 0;
    }
  }
  
  taskCounts.value = counts;
  console.log('📊 Updated task counts:', counts);
};

const showHome = () => {
  currentView.value = 'home';
  selectedListId.value = null;
};

const showSettings = () => {
  currentView.value = 'settings';
};

const handleSelectList = (id: string) => {
  selectedListId.value = id;
  currentView.value = 'list';
  
  // Sync active list with background script
  messaging.sendFireAndForget('set-active-list', { listId: id });
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

// Load scanned items
const loadScannedItems = async () => {
  try {
    // Get current tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      const result = await messaging.send('get-scan-results', { tabId: tabs[0].id });
      if (result && 'items' in result && result.items) {
        scannedItems.value = result.items;
        showScannedItems.value = result.items.length > 0;
      }
    }
  } catch (error) {
    console.error('Failed to load scanned items:', error);
  }
};

// Add scanned item to current list
const addScannedItem = async (item: ScannedItem) => {
  if (!selectedListId.value) return;
  
  try {
    const success = await createTask({
      list_id: selectedListId.value,
      title: item.title,
    });
    
    if (success) {
      // Remove from scanned items
      const index = scannedItems.value.findIndex(i => i.title === item.title);
      if (index !== -1) {
        scannedItems.value.splice(index, 1);
      }
      
      // Update scanned items display
      if (scannedItems.value.length === 0) {
        showScannedItems.value = false;
      }
    }
  } catch (error) {
    console.error('Failed to add scanned item:', error);
  }
};

// Add all scanned items
const addAllScannedItems = async () => {
  if (!selectedListId.value) return;
  
  try {
    const result = await messaging.send('add-items', {
      listId: selectedListId.value,
      items: scannedItems.value
    });
    
    if (result && 'added' in result && result.added > 0) {
      scannedItems.value = [];
      showScannedItems.value = false;
    }
  } catch (error) {
    console.error('Failed to add all scanned items:', error);
  }
};

// Dismiss scanned items
const dismissScannedItems = async () => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      await messaging.send('clear-scan-results', { tabId: tabs[0].id });
      scannedItems.value = [];
      showScannedItems.value = false;
    }
  } catch (error) {
    console.error('Failed to dismiss scanned items:', error);
  }
};

// Load active list on mount
onMounted(async () => {
  try {
    const result = await messaging.send('get-active-list', undefined);
    if (result && 'list' in result && result.list) {
      selectedListId.value = result.list.id;
      currentView.value = 'list';
    }
  } catch (error) {
    console.error('Failed to load active list:', error);
  }
  
  // Load scanned items
  await loadScannedItems();
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

/* Scanned Items Panel */
.scanned-items-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e0e0e0;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
}

.scanned-items__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.scanned-items__title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.scanned-items__dismiss {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanned-items__dismiss:hover {
  color: #333;
}

.scanned-items__list {
  padding: 8px;
}

.scanned-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 8px;
  background: #fafafa;
}

.scanned-item:last-child {
  margin-bottom: 0;
}

.scanned-item__content {
  flex: 1;
  margin-right: 8px;
}

.scanned-item__title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.scanned-item__description {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  line-height: 1.3;
}

.scanned-item__meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
}

.scanned-item__confidence {
  color: #4CAF50;
  font-weight: 500;
}

.scanned-item__type {
  color: #666;
  text-transform: capitalize;
}

.scanned-item__add-btn {
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.scanned-item__add-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.scanned-item__add-btn:hover:not(:disabled) {
  background: #45a049;
}

.scanned-items__actions {
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.scanned-items__add-all {
  width: 100%;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.scanned-items__add-all:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.scanned-items__add-all:hover:not(:disabled) {
  background: #1976D2;
}
</style>
