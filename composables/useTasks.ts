import { ref, computed, watch, type Ref } from 'vue';
import { itemService } from '../services/itemService';
import { listService } from '../services/listService';
import type { ItemProjection } from '../services/database';

export interface Task {
  id: string;
  list_id: string;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export function useTasks(selectedListId: Ref<string | null>) {
  const tasks = ref<Task[]>([]);
  const items = ref<ItemProjection[]>([]);

  const createTask = async (taskData: Omit<Task, 'id' | 'completed' | 'created_at' | 'updated_at'>): Promise<Task | null> => {
    try {
      // Create a simple JSON-LD item for the task
      const jsonLdData = {
        '@context': 'https://schema.org',
        '@type': 'Task',
        '@id': `task-${Date.now()}`,
        name: taskData.title,
        url: window.location.href,
        description: `Task: ${taskData.title}`,
      };

      // Create item using itemService
      const item = await itemService.createItem(jsonLdData);
      if (!item) {
        console.error('Failed to create item');
        return null;
      }

      // Link item to list if we have a selected list
      if (selectedListId.value) {
        await itemService.linkItemToList(item.id, selectedListId.value);
      }

      // Convert to Task format for backward compatibility
      const newTask: Task = {
        id: item.id,
        list_id: taskData.list_id,
        title: item.name,
        completed: false,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };
      
      tasks.value.push(newTask);
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      return null;
    }
  };

  const toggleTask = async (id: string): Promise<boolean> => {
    try {
      const task = tasks.value.find(t => t.id === id);
      if (task) {
        task.completed = !task.completed;
        task.updated_at = new Date().toISOString();
        
        // Update the item in the store
        await itemService.updateItem(id, {
          name: task.title,
          description: `Task: ${task.title} (${task.completed ? 'Completed' : 'Pending'})`,
        });
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling task:', error);
      return false;
    }
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      const index = tasks.value.findIndex(task => task.id === id);
      if (index !== -1) {
        tasks.value.splice(index, 1);
        
        // Delete the item from the store
        await itemService.deleteItem(id);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<boolean> => {
    try {
      const task = tasks.value.find(t => t.id === id);
      if (task) {
        Object.assign(task, updates);
        task.updated_at = new Date().toISOString();
        
        // Update the item in the store
        await itemService.updateItem(id, {
          name: task.title,
          description: `Task: ${task.title}`,
        });
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating task:', error);
      return false;
    }
  };

  // Load items for the selected list
  const loadItemsForList = async (listId: string): Promise<void> => {
    try {
      const listItems = await itemService.getItemsForList(listId);
      items.value = listItems;
      
      // Convert items to tasks for backward compatibility
      tasks.value = listItems.map(item => ({
        id: item.id,
        list_id: listId,
        title: item.name,
        completed: false, // We'll need to add completion tracking to items later
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    } catch (error) {
      console.error('Error loading items for list:', error);
    }
  };

  // Filter tasks by selected list
  const filteredTasks = computed(() => {
    if (!selectedListId.value) return [];
    return tasks.value.filter(task => task.list_id === selectedListId.value);
  });

  // Watch for list changes and load items
  watch(selectedListId, async (newListId) => {
    if (newListId) {
      await loadItemsForList(newListId);
    } else {
      tasks.value = [];
      items.value = [];
    }
  });

  return {
    tasks: filteredTasks,
    items,
    createTask,
    toggleTask,
    deleteTask,
    updateTask,
    loadItemsForList,
  };
}
