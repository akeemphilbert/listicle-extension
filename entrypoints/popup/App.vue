<template>
  <div class="app">
    <Header
        @home="showHome"
        @add="showAddListModal = true"
    />

    <!-- Test Controls -->
    <div class="test-controls">
      <button @click="triggerRecipeScan" class="test-btn" :disabled="isScanning">
        <span v-if="isScanning">⏳</span>
        <span v-else>🔍</span>
        {{ isScanning ? 'Scanning...' : 'Check Microformats' }}
      </button>
    </div>

    <div class="app__content">
      <HomeView
          v-if="currentView === 'home'"
          :lists="activeListsArray"
          :task-counts="taskCounts"
          @select-list="handleSelectList"
          @delete-list="handleDeleteList"
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
import { storeToRefs } from 'pinia';
import Header from '@/components/organisms/Header.vue';
import HomeView from '@/components/organisms/HomeView.vue';
import TaskList from '@/components/organisms/TaskList.vue';
import { useListsStore, type ListProjection } from '@/stores/listsStore';
import { useEventStore } from '@/stores/eventStore';
import { listService } from '@/services/listService';
import { db } from '@/services/database';
import { useTasks } from '@/composables/useTasks';
import { messaging } from '@/utils/messaging';
import { microformatExtractor } from '@/services/microformatExtractor';

// Convert Dexie observables to reactive refs
const activeListsArray = ref<ListProjection[]>([]);

// Subscribe to the observable after store initialization
let unsubscribeActiveLists: any = null;

// Store references - will be initialized in onMounted
let eventStore: any = null;
let listsStore: any = null;

// Initialize services and stores
onMounted(async () => {
  // Initialize stores first
  eventStore = useEventStore();
  listsStore = useListsStore();
  
  await listService.initialize();
  await eventStore.initialize();
  await listsStore.initialize();
  
  // Debug: Check what's actually in the database
  console.log('Checking database contents...');
  const allProjections = await db.listProjections.toArray();
  console.log('All projections in DB:', allProjections);
  const activeProjections = allProjections.filter(list => !list.deleted);
  console.log('Active projections in DB:', activeProjections);
  
  // Subscribe to active lists after initialization
  console.log('Setting up lists store...');
  console.log('Lists store methods:', Object.keys(listsStore));
  
  // Check if refreshLists exists
  if (typeof listsStore.refreshLists === 'function') {
    console.log('refreshLists function found, calling it...');
    await listsStore.refreshLists();
    activeListsArray.value = listsStore.activeLists;
  } else {
    console.log('refreshLists function not found, using manual approach...');
    const manualLists = await listsStore.getActiveLists();
    activeListsArray.value = manualLists;
  }
  
  // Watch for changes to activeLists and update our local array
  watch(() => listsStore.activeLists, (newLists) => {
    console.log('Lists store updated:', newLists);
    activeListsArray.value = newLists;
  }, { deep: true });
});

// Cleanup on unmount
onUnmounted(() => {
  // No cleanup needed for the new approach
});

const selectedListId = ref<string | null>(null);
const currentView = ref<'home' | 'list'>('home');
const { tasks, createTask, toggleTask, deleteTask } = useTasks(selectedListId);
const showAddItemModal = ref(false);
const showAddListModal = ref(false);
const newItemTitle = ref('');
const newListName = ref('');
const newListDescription = ref('');
const itemInput = ref<HTMLInputElement | null>(null);
const listInput = ref<HTMLInputElement | null>(null);
const isScanning = ref(false);

const selectedList = computed(() => {
  return activeListsArray.value.find(list => list.id === selectedListId.value) || null;
});

const taskCounts = computed(() => {
  const counts: Record<string, number> = {};
  activeListsArray.value.forEach(list => {
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
      // Refresh the lists
      await listsStore.refreshLists();
      activeListsArray.value = listsStore.activeLists;
      
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

const triggerRecipeScan = async () => {
  if (isScanning.value) return;
  
  try {
    isScanning.value = true;
    
    // Get current tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      // Get the page HTML and use the microformatExtractor service
      const pageData = await browser.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          return {
            title: document.title,
            url: window.location.href,
            html: document.documentElement.outerHTML
          };
        }
      });

      if (pageData && pageData[0] && pageData[0].result) {
        const { title, url, html } = pageData[0].result;
        
        // Create a temporary DOM to use with the microformatExtractor service
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Create a custom microformatExtractor instance that works with the parsed DOM
        const customExtractor = {
          extractAll: function() {
            return {
              title: doc.title || title,
              description: this.extractDescription(),
              url: url,
              content: this.extractMainContent(),
              microformats: {
                schemaOrg: this.extractSchemaOrg(),
                microdata: this.extractMicrodata(),
                openGraph: this.extractOpenGraph(),
                twitter: this.extractTwitterCards(),
                semantic: this.extractSemanticHTML(),
              },
            };
          },
          
          extractSchemaOrg: function() {
            const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
            const schemas: any[] = [];
            scripts.forEach((script: any) => {
              try {
                const data = JSON.parse(script.textContent || '');
                if (Array.isArray(data)) {
                  schemas.push(...data);
                } else {
                  schemas.push(data);
                }
              } catch (error) {
                console.warn('Failed to parse JSON-LD:', error);
              }
            });
            return schemas;
          },
          
          extractMicrodata: function() {
            const items: any[] = [];
            const microdataElements = doc.querySelectorAll('[itemscope]');
            microdataElements.forEach((element: any) => {
              const item: any = {
                type: element.getAttribute('itemtype'),
                properties: {},
              };
              const properties = element.querySelectorAll('[itemprop]');
              properties.forEach((prop: any) => {
                const propName = prop.getAttribute('itemprop');
                if (propName) {
                  const value = this.getMicrodataValue(prop);
                  if (item.properties[propName]) {
                    if (Array.isArray(item.properties[propName])) {
                      item.properties[propName].push(value);
                    } else {
                      item.properties[propName] = [item.properties[propName], value];
                    }
                  } else {
                    item.properties[propName] = value;
                  }
                }
              });
              items.push(item);
            });
            return items;
          },
          
          getMicrodataValue: function(element: any) {
            if (element.hasAttribute('itemscope')) {
              return element.getAttribute('itemtype') || '';
            }
            const tagName = element.tagName.toLowerCase();
            if (tagName === 'meta') {
              return element.getAttribute('content') || '';
            } else if (tagName === 'img') {
              return element.getAttribute('src') || '';
            } else if (tagName === 'a') {
              return element.getAttribute('href') || '';
            } else if (tagName === 'time') {
              return element.getAttribute('datetime') || element.textContent || '';
            } else {
              return element.textContent || '';
            }
          },
          
          extractOpenGraph: function() {
            const og: any = {};
            const metaTags = doc.querySelectorAll('meta[property^="og:"]');
            metaTags.forEach((meta: any) => {
              const property = meta.getAttribute('property');
              const content = meta.getAttribute('content');
              if (property && content) {
                og[property] = content;
              }
            });
            return og;
          },
          
          extractTwitterCards: function() {
            const twitter: any = {};
            const metaTags = doc.querySelectorAll('meta[name^="twitter:"]');
            metaTags.forEach((meta: any) => {
              const name = meta.getAttribute('name');
              const content = meta.getAttribute('content');
              if (name && content) {
                twitter[name] = content;
              }
            });
            return twitter;
          },
          
          extractSemanticHTML: function() {
            return {
              headings: this.extractHeadings(),
              lists: this.extractLists(),
              tables: this.extractTables(),
            };
          },
          
          extractHeadings: function() {
            const headings: any[] = [];
            const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headingElements.forEach((heading: any) => {
              const text = heading.textContent?.trim();
              if (text) {
                headings.push(text);
              }
            });
            return headings;
          },
          
          extractLists: function() {
            const lists: any[] = [];
            const listElements = doc.querySelectorAll('ul, ol');
            listElements.forEach((list: any) => {
              const items = list.querySelectorAll('li');
              items.forEach((item: any) => {
                const text = item.textContent?.trim();
                if (text) {
                  lists.push(text);
                }
              });
            });
            return lists;
          },
          
          extractTables: function() {
            const tables: any[] = [];
            const tableElements = doc.querySelectorAll('table');
            tableElements.forEach((table: any) => {
              const rows = table.querySelectorAll('tr');
              rows.forEach((row: any) => {
                const cells = row.querySelectorAll('td, th');
                const rowData: any[] = [];
                cells.forEach((cell: any) => {
                  const text = cell.textContent?.trim();
                  if (text) {
                    rowData.push(text);
                  }
                });
                if (rowData.length > 0) {
                  tables.push(rowData.join(' | '));
                }
              });
            });
            return tables;
          },
          
          extractDescription: function() {
            const metaDesc = doc.querySelector('meta[name="description"]');
            if (metaDesc) return metaDesc.getAttribute('content') || '';
            const ogDesc = doc.querySelector('meta[property="og:description"]');
            if (ogDesc) return ogDesc.getAttribute('content') || '';
            const twitterDesc = doc.querySelector('meta[name="twitter:description"]');
            if (twitterDesc) return twitterDesc.getAttribute('content') || '';
            return '';
          },
          
          extractMainContent: function() {
            const mainSelectors = ['main', 'article', '[role="main"]', '.content', '#content', '.main-content', '.post-content', '.entry-content'];
            for (const selector of mainSelectors) {
              const element = doc.querySelector(selector);
              if (element) {
                return this.extractTextContent(element);
              }
            }
            return this.extractTextContent(doc.body);
          },
          
          extractTextContent: function(element: any) {
            const clone = element.cloneNode(true);
            const scripts = clone.querySelectorAll('script, style, noscript');
            scripts.forEach((script: any) => script.remove());
            let text = clone.textContent || '';
            text = text.replace(/\s+/g, ' ').trim();
            if (text.length > 5000) {
              text = text.substring(0, 5000) + '...';
            }
            return text;
          }
        };
        
        try {
          // Use the custom extractor that works with the parsed DOM
          const extractedData = customExtractor.extractAll();
          
          // Process the results for recipe detection
          const microformats = extractedData.microformats;
          
          // Check for recipe-related microformats
          const hasRecipeSchema = microformats.schemaOrg?.some((schema: any) => 
            schema['@type'] === 'Recipe' || 
            schema.type === 'Recipe' ||
            (Array.isArray(schema['@type']) && schema['@type'].includes('Recipe'))
          );
          
          const hasRecipeMicrodata = microformats.microdata?.some((item: any) => 
            item.type === 'http://schema.org/Recipe' ||
            item.type === 'https://schema.org/Recipe'
          );
          
          // Check if any microformats are present
          const hasSchemaOrg = microformats.schemaOrg && microformats.schemaOrg.length > 0;
          const hasMicrodata = microformats.microdata && microformats.microdata.length > 0;
          const hasOpenGraph = Object.keys(microformats.openGraph || {}).length > 0;
          const hasTwitter = Object.keys(microformats.twitter || {}).length > 0;
          const hasSemantic = ((microformats.semantic?.headings?.length || 0) > 0 || 
                              (microformats.semantic?.lists?.length || 0) > 0 || 
                              (microformats.semantic?.tables?.length || 0) > 0);
          
          const hasAnyMicroformats = hasSchemaOrg || hasMicrodata || hasOpenGraph || hasTwitter || hasSemantic;
          
          if (hasRecipeSchema || hasRecipeMicrodata) {
            // Found recipe-specific microformats
            const recipeSchemas = microformats.schemaOrg?.filter((schema: any) => 
              schema['@type'] === 'Recipe' || 
              schema.type === 'Recipe' ||
              (Array.isArray(schema['@type']) && schema['@type'].includes('Recipe'))
            ) || [];
            
            const recipeMicrodata = microformats.microdata?.filter((item: any) => 
              item.type === 'http://schema.org/Recipe' ||
              item.type === 'https://schema.org/Recipe'
            ) || [];
            
            const totalRecipes = recipeSchemas.length + recipeMicrodata.length;
            
            alert(`🍳 Found ${totalRecipes} recipe(s)!\n\nRecipe microformats detected:\n${recipeSchemas.map((r: any) => `• ${r.name || r.headline || 'Untitled Recipe'}`).join('\n')}\n${recipeMicrodata.map((r: any) => `• ${r.properties.name || 'Untitled Recipe'}`).join('\n')}\n\nPage: ${title}`);
          } else if (hasAnyMicroformats) {
            // Found other microformats but no recipes
            const foundTypes = [];
            if (hasSchemaOrg) foundTypes.push(`Schema.org (${microformats.schemaOrg?.length || 0})`);
            if (hasMicrodata) foundTypes.push(`Microdata (${microformats.microdata?.length || 0})`);
            if (hasOpenGraph) foundTypes.push(`Open Graph (${Object.keys(microformats.openGraph || {}).length})`);
            if (hasTwitter) foundTypes.push(`Twitter Cards (${Object.keys(microformats.twitter || {}).length})`);
            if (hasSemantic) foundTypes.push(`Semantic HTML`);
            
            alert(`📄 Microformats detected but no recipes found.\n\nFound: ${foundTypes.join(', ')}\n\nTry visiting a recipe website like allrecipes.com or foodnetwork.com`);
          } else {
            alert('❌ No microformats found on this page.\n\nTry visiting a site with structured data like:\n• Recipe sites (allrecipes.com, foodnetwork.com)\n• News sites (bbc.com, cnn.com)\n• E-commerce sites (amazon.com, ebay.com)');
          }
        } catch (serviceError) {
          throw serviceError;
        }
      } else {
        alert('Failed to get page data');
      }
    } else {
      alert('Could not get current tab');
    }
  } catch (error) {
    console.error('Microformat scan failed:', error);
    alert('Scan failed: ' + (error as Error).message);
  } finally {
    isScanning.value = false;
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
  if (activeListsArray.value.length === 0) {
    await listService.createList('Inbox', 'inbox', '#4073ff');
  }
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

/* Test Controls */
.test-controls {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.test-btn {
  width: 100%;
  background: #FF6B6B;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.test-btn:hover:not(:disabled) {
  background: #FF5252;
}

.test-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
