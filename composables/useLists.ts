import { ref, computed } from 'vue';

export interface List {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export function useLists() {
  const lists = ref<List[]>([]);

  const createList = async (listData: Omit<List, 'id' | 'created_at' | 'updated_at'>): Promise<List | null> => {
    try {
      const newList: List = {
        id: Date.now().toString(),
        ...listData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      lists.value.push(newList);
      return newList;
    } catch (error) {
      console.error('Error creating list:', error);
      return null;
    }
  };

  const updateList = async (id: string, updates: Partial<List>): Promise<boolean> => {
    try {
      const index = lists.value.findIndex(list => list.id === id);
      if (index !== -1) {
        lists.value[index] = {
          ...lists.value[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating list:', error);
      return false;
    }
  };

  const deleteList = async (id: string): Promise<boolean> => {
    try {
      const index = lists.value.findIndex(list => list.id === id);
      if (index !== -1) {
        lists.value.splice(index, 1);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting list:', error);
      return false;
    }
  };

  return {
    lists: computed(() => lists.value),
    createList,
    updateList,
    deleteList,
  };
}
