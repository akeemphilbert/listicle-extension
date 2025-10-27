import { Item } from '../domain/item';
import { useEventStore } from '../stores/eventStore';
import { db, type ItemProjection } from './database';

/**
 * Item Service
 * Handles business logic for item operations including creation, updates, and relationships
 */
export class ItemService {
  private _eventStore: any = null;

  private get eventStore() {
    if (!this._eventStore) {
      this._eventStore = useEventStore();
    }
    return this._eventStore;
  }

  /**
   * Extract normalized fields from JSON-LD data
   * @param jsonLd The JSON-LD object
   * @returns Normalized fields
   */
  private extractNormalizedFields(jsonLd: any): {
    id: string;
    name: string;
    url: string;
    image?: string;
    description?: string;
    type: string;
  } {
    // Extract ID - prefer @id, fallback to url field, then generate from URL
    let id = jsonLd['@id'] || jsonLd.url || jsonLd.identifier;
    if (!id && jsonLd.url) {
      id = jsonLd.url; // Use URL as ID if no @id present
    }

    // Extract name/title
    const name = jsonLd.name || jsonLd.title || jsonLd.headline || 'Untitled';

    // Extract URL
    const url = jsonLd.url || jsonLd['@id'] || window.location.href;

    // Extract image
    let image: string | undefined;
    if (jsonLd.image) {
      if (typeof jsonLd.image === 'string') {
        image = jsonLd.image;
      } else if (jsonLd.image.url) {
        image = jsonLd.image.url;
      } else if (Array.isArray(jsonLd.image) && jsonLd.image.length > 0) {
        image = typeof jsonLd.image[0] === 'string' ? jsonLd.image[0] : jsonLd.image[0].url;
      }
    }

    // Extract description
    const description = jsonLd.description || jsonLd.summary || jsonLd.abstract;

    // Extract type
    const type = jsonLd['@type'] || 'Thing';

    return {
      id,
      name,
      url,
      image,
      description,
      type,
    };
  }

  /**
   * Create a new item from JSON-LD data
   * @param jsonLdData The JSON-LD object
   * @returns The created item or existing item if duplicate
   */
  async createItem(jsonLdData: any): Promise<ItemProjection | null> {
    try {
      const normalizedFields = this.extractNormalizedFields(jsonLdData);
      
      // Check for duplicates by URL
      const existingItem = await db.itemProjections.where('url').equals(normalizedFields.url).first();
      if (existingItem) {
        console.log('Item already exists:', existingItem);
        return existingItem;
      }

      // Create new item aggregate
      const item = Item.create(
        normalizedFields.id,
        normalizedFields.name,
        normalizedFields.url,
        normalizedFields.type,
        jsonLdData,
        normalizedFields.image,
        normalizedFields.description
      );

      // Emit events
      const events = item.getAllUncommittedEvents();
      await this.eventStore.appendEvents(events);

      // Mark events as committed
      item.markAllEventsAsCommitted();

      // Return the projection
      return await db.itemProjections.get(normalizedFields.id) || null;
    } catch (error) {
      console.error('Error creating item:', error);
      return null;
    }
  }

  /**
   * Update an existing item
   * @param id The item ID
   * @param updates Partial updates
   * @returns True if successful
   */
  async updateItem(id: string, updates: {
    name?: string;
    image?: string;
    description?: string;
    jsonLd?: any;
  }): Promise<boolean> {
    try {
      const existingItem = await db.itemProjections.get(id);
      if (!existingItem) {
        console.error('Item not found:', id);
        return false;
      }

      // Reconstruct item from events
      const events = await this.eventStore.getEventsByAggregateId(id);
      const item = Item.fromEvents(id, events);

      // Apply updates
      if (updates.name !== undefined || updates.image !== undefined || updates.description !== undefined) {
        item.updateMetadata({
          name: updates.name,
          image: updates.image,
          description: updates.description,
        });
      }

      if (updates.jsonLd !== undefined) {
        item.updateJsonLd(updates.jsonLd);
      }

      // Emit events
      const newEvents = item.getAllUncommittedEvents();
      await this.eventStore.appendEvents(newEvents);

      // Mark events as committed
      item.markAllEventsAsCommitted();

      return true;
    } catch (error) {
      console.error('Error updating item:', error);
      return false;
    }
  }

  /**
   * Delete an item
   * @param id The item ID
   * @returns True if successful
   */
  async deleteItem(id: string): Promise<boolean> {
    try {
      const existingItem = await db.itemProjections.get(id);
      if (!existingItem) {
        console.error('Item not found:', id);
        return false;
      }

      // Reconstruct item from events
      const events = await this.eventStore.getEventsByAggregateId(id);
      const item = Item.fromEvents(id, events);

      // Delete the item
      item.delete();

      // Emit events
      const newEvents = item.getAllUncommittedEvents();
      await this.eventStore.appendEvents(newEvents);

      // Mark events as committed
      item.markAllEventsAsCommitted();

      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      return false;
    }
  }

  /**
   * Get an item by ID
   * @param id The item ID
   * @returns The item projection or null
   */
  async getItemById(id: string): Promise<ItemProjection | null> {
    return await db.itemProjections.get(id) || null;
  }

  /**
   * Get an item by URL
   * @param url The item URL
   * @returns The item projection or null
   */
  async getItemByUrl(url: string): Promise<ItemProjection | null> {
    return await db.itemProjections.where('url').equals(url).first() || null;
  }

  /**
   * Link an item to a list
   * @param itemId The item ID
   * @param listId The list ID
   * @returns True if successful
   */
  async linkItemToList(itemId: string, listId: string): Promise<boolean> {
    try {
      await db.createTriple(itemId, 'belongs_to', listId);
      return true;
    } catch (error) {
      console.error('Error linking item to list:', error);
      return false;
    }
  }

  /**
   * Unlink an item from a list
   * @param itemId The item ID
   * @param listId The list ID
   * @returns True if successful
   */
  async unlinkItemFromList(itemId: string, listId: string): Promise<boolean> {
    try {
      await db.deleteTriple(itemId, 'belongs_to', listId);
      return true;
    } catch (error) {
      console.error('Error unlinking item from list:', error);
      return false;
    }
  }

  /**
   * Get items for a specific list
   * @param listId The list ID
   * @returns Array of item projections
   */
  async getItemsForList(listId: string): Promise<ItemProjection[]> {
    return await db.getItemsForList(listId);
  }

  /**
   * Get lists for a specific item
   * @param itemId The item ID
   * @returns Array of list projections
   */
  async getListsForItem(itemId: string): Promise<any[]> {
    return await db.getListsForItem(itemId);
  }

  /**
   * Get all active items
   * @returns Array of active item projections
   */
  async getAllActiveItems(): Promise<ItemProjection[]> {
    return await db.itemProjections.toArray();
  }

  /**
   * Search items by name or description
   * @param query The search query
   * @returns Array of matching item projections
   */
  async searchItems(query: string): Promise<ItemProjection[]> {
    const allItems = await db.itemProjections.toArray();
    const lowercaseQuery = query.toLowerCase();
    
    return allItems.filter((item: ItemProjection) => 
      item.name.toLowerCase().includes(lowercaseQuery) ||
      (item.description && item.description.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Get items by type
   * @param type The JSON-LD @type
   * @returns Array of item projections
   */
  async getItemsByType(type: string): Promise<ItemProjection[]> {
    const allItems = await db.itemProjections.toArray();
    return allItems.filter((item: ItemProjection) => item.type === type);
  }
}

/**
 * Background-safe item creation that bypasses Pinia
 * Used in background script where Pinia is not initialized
 */
export async function createItemDirect(jsonLdData: any): Promise<ItemProjection | null> {
  try {
    const normalizedFields = extractNormalizedFields(jsonLdData);
    
    // Check for duplicates by URL
    const existingItem = await db.itemProjections.where('url').equals(normalizedFields.url).first();
    if (existingItem) {
      console.log('Item already exists:', existingItem);
      return existingItem;
    }

    // Create new item aggregate
    const item = Item.create(
      normalizedFields.id,
      normalizedFields.name,
      normalizedFields.url,
      normalizedFields.type,
      jsonLdData,
      normalizedFields.image,
      normalizedFields.description
    );

    // Emit events directly to database instead of through event store
    const events = item.getAllUncommittedEvents();
    
    // Add events directly to database
    if (events.length > 0) {
      await db.itemEvents.bulkAdd(events);
      for (const event of events) {
        await db.updateItemProjection(event);
      }
    }

    // Mark events as committed
    item.markAllEventsAsCommitted();

    // Return the projection
    return await db.itemProjections.get(normalizedFields.id) || null;
  } catch (error) {
    console.error('Error creating item (direct):', error);
    return null;
  }
}

/**
 * Background-safe item linking that bypasses Pinia
 * Used in background script where Pinia is not initialized
 */
export async function linkItemToListDirect(itemId: string, listId: string): Promise<boolean> {
  try {
    await db.createTriple(itemId, 'belongs_to', listId);
    return true;
  } catch (error) {
    console.error('Error linking item to list (direct):', error);
    return false;
  }
}

/**
 * Helper function to extract normalized fields
 */
function extractNormalizedFields(jsonLd: any): {
  id: string;
  name: string;
  url: string;
  image?: string;
  description?: string;
  type: string;
} {
  // Extract ID - prefer @id, fallback to url field, then generate from URL
  let id = jsonLd['@id'] || jsonLd.url || jsonLd.identifier;
  if (!id && jsonLd.url) {
    id = jsonLd.url; // Use URL as ID if no @id present
  }

  // Extract name/title
  const name = jsonLd.name || jsonLd.title || jsonLd.headline || 'Untitled';

  // Extract URL
  const url = jsonLd.url || jsonLd['@id'] || '';

  // Extract image
  let image: string | undefined;
  if (jsonLd.image) {
    if (typeof jsonLd.image === 'string') {
      image = jsonLd.image;
    } else if (jsonLd.image.url) {
      image = jsonLd.image.url;
    } else if (Array.isArray(jsonLd.image) && jsonLd.image.length > 0) {
      image = typeof jsonLd.image[0] === 'string' ? jsonLd.image[0] : jsonLd.image[0].url;
    }
  }

  // Extract description
  const description = jsonLd.description || jsonLd.summary || jsonLd.abstract;

  // Extract type
  const type = jsonLd['@type'] || 'Thing';

  return {
    id,
    name,
    url,
    image,
    description,
    type,
  };
}

// Export singleton instance
export const itemService = new ItemService();
