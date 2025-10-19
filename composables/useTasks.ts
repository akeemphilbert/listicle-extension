import { ref, computed, watch, type Ref } from 'vue';

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

  const createTask = async (taskData: Omit<Task, 'id' | 'completed' | 'created_at' | 'updated_at'>): Promise<Task | null> => {
    try {
      const newTask: Task = {
        id: Date.now().toString(),
        ...taskData,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating task:', error);
      return false;
    }
  };

  // Filter tasks by selected list
  const filteredTasks = computed(() => {
    if (!selectedListId.value) return [];
    return tasks.value.filter(task => task.list_id === selectedListId.value);
  });

  // Watch for list changes and clear tasks when switching lists
  watch(selectedListId, () => {
    // In a real app, you might want to load tasks for the selected list here
    // For now, we'll just use the filtered tasks
  });

  return {
    tasks: filteredTasks,
    createTask,
    toggleTask,
    deleteTask,
    updateTask,
  };
}
