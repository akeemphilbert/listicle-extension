import Dexie, { Table } from 'dexie';
import { DomainEvent } from '../domain/common/DomainEvent';

// Define interfaces for projections
export interface ListProjection {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Define interfaces for new tables
export interface ItemProjection {
  id: string;           // URN/URL
  name: string;
  url: string;
  image?: string;
  description?: string;
  type: string;         // JSON-LD @type
  jsonLd: any;          // Full JSON-LD object
  created_at: string;
  updated_at: string;
}

export interface TripleProjection {
  id?: number;
  subject: string;      // Item ID
  predicate: string;    // Relationship type (e.g., 'belongs_to')
  object: string;       // List ID
  created_at: string;
}

// Define the database schema
export class ListicleDatabase extends Dexie {
  // Event stores
  listEvents!: Table<DomainEvent>;
  itemEvents!: Table<DomainEvent>;
  
  // Projection stores
  listProjections!: Table<ListProjection>;
  itemProjections!: Table<ItemProjection>;
  triples!: Table<TripleProjection>;

  constructor() {
    super('ListicleDatabase');
    
    this.version(3).stores({
      // Event stores with indexes for efficient querying
      listEvents: '++id, aggregateId, type, sequenceNo, timestamp',
      itemEvents: '++id, aggregateId, type, sequenceNo, timestamp',
      
      // Projection stores with indexes for queries
      listProjections: 'id, name, created_at',
      itemProjections: 'id, name, url, type, created_at',
      
      // Triples table for relationships
      triples: '++id, subject, predicate, object, created_at, [subject+predicate+object]',
    });
  }
  
  /**
   * Update list projection based on domain event
   * @param event The domain event that occurred
   */
  async updateListProjection(event: DomainEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'ListCreated':
          await this.handleListCreated(event);
          break;
        case 'ListUpdated':
          await this.handleListUpdated(event);
          break;
        case 'ListDeleted':
          await this.handleListDeleted(event);
          break;
      }
    } catch (error) {
      console.error('Error updating list projection:', error);
    }
  }

  /**
   * Update item projection based on domain event
   * @param event The domain event that occurred
   */
  async updateItemProjection(event: DomainEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'ItemCreated':
          await this.handleItemCreated(event);
          break;
        case 'ItemUpdated':
          await this.handleItemUpdated(event);
          break;
        case 'ItemDeleted':
          await this.handleItemDeleted(event);
          break;
      }
    } catch (error) {
      console.error('Error updating item projection:', error);
    }
  }

  /**
   * Handle triple events for relationship management
   * @param event The triple event
   */
  async handleTripleEvent(event: DomainEvent): Promise<void> {
    try {
      if (event.type === 'TripleEvent') {
        const tripleData = event.data as any;
        const predicate = tripleData.predicate;
        
        if (predicate === 'CONTAINS' || predicate === 'belongs_to') {
          // Create relationship
          await this.createTriple(
            tripleData.subject.id,
            predicate,
            tripleData.object.id
          );
        } else if (predicate === 'ORDERED_BY') {
          // For ordering, we might want to update existing triple or create new one
          // For now, just create the triple
          await this.createTriple(
            tripleData.subject.id,
            predicate,
            tripleData.object.id
          );
        }
      }
    } catch (error) {
      console.error('Error handling triple event:', error);
    }
  }
  
  /**
   * Handle ListCreated events
   */
  private async handleListCreated(event: DomainEvent): Promise<void> {
    console.log('Handling ListCreated event:', event);
    const listData = event.data as any;
    console.log('List data:', listData);
    const projection: ListProjection = {
      id: event.aggregateId, // Use aggregateId from event
      name: listData.name,
      icon: listData.icon,
      color: listData.color,
      description: listData.metadata?.description,
      created_at: listData.createdAt.toISOString(),
      updated_at: listData.updatedAt.toISOString(),
    };
    
    console.log('Creating projection:', projection);
    await this.listProjections.add(projection);
    console.log('Projection created successfully');
  }
  
  /**
   * Handle ListUpdated events
   */
  private async handleListUpdated(event: DomainEvent): Promise<void> {
    const listData = event.data as any;
    const existingProjection = await this.listProjections.get(event.aggregateId);
    
    if (existingProjection) {
      const updatedProjection: ListProjection = {
        ...existingProjection,
        name: listData.name,
        icon: listData.icon,
        color: listData.color,
        description: listData.metadata?.description,
        updated_at: listData.updatedAt.toISOString(),
      };
      
      await this.listProjections.put(updatedProjection);
    }
  }
  
  /**
   * Handle ListDeleted events
   */
  private async handleListDeleted(event: DomainEvent): Promise<void> {
    await this.listProjections.delete(event.aggregateId);
  }

  /**
   * Handle ItemCreated events
   */
  private async handleItemCreated(event: DomainEvent): Promise<void> {
    console.log('Handling ItemCreated event:', event);
    const itemData = event.data as any;
    console.log('Item data:', itemData);
    const projection: ItemProjection = {
      id: itemData.id,
      name: itemData.name,
      url: itemData.url,
      image: itemData.image,
      description: itemData.description,
      type: itemData.type,
      jsonLd: itemData.jsonLd,
      created_at: itemData.createdAt.toISOString(),
      updated_at: itemData.updatedAt.toISOString(),
    };
    
    console.log('Creating item projection:', projection);
    await this.itemProjections.add(projection);
    console.log('Item projection created successfully');
  }

  /**
   * Handle ItemUpdated events
   */
  private async handleItemUpdated(event: DomainEvent): Promise<void> {
    const itemData = event.data as any;
    const existingProjection = await this.itemProjections.get(event.aggregateId);
    
    if (existingProjection) {
      const updatedProjection: ItemProjection = {
        ...existingProjection,
        name: itemData.name || existingProjection.name,
        url: itemData.url || existingProjection.url,
        image: itemData.image !== undefined ? itemData.image : existingProjection.image,
        description: itemData.description !== undefined ? itemData.description : existingProjection.description,
        type: itemData.type || existingProjection.type,
        jsonLd: itemData.jsonLd || existingProjection.jsonLd,
        updated_at: itemData.updatedAt.toISOString(),
      };
      
      await this.itemProjections.put(updatedProjection);
    }
  }

  /**
   * Handle ItemDeleted events
   */
  private async handleItemDeleted(event: DomainEvent): Promise<void> {
    await this.itemProjections.delete(event.aggregateId);
  }

  /**
   * Create a triple relationship
   * @param subject The subject ID (item ID)
   * @param predicate The relationship type
   * @param object The object ID (list ID)
   */
  async createTriple(subject: string, predicate: string, object: string): Promise<void> {
    const triple: TripleProjection = {
      subject,
      predicate,
      object,
      created_at: new Date().toISOString(),
    };
    
    await this.triples.add(triple);
  }

  /**
   * Delete a triple relationship
   * @param subject The subject ID
   * @param predicate The relationship type
   * @param object The object ID
   */
  async deleteTriple(subject: string, predicate: string, object: string): Promise<void> {
    await this.triples.where('[subject+predicate+object]').equals([subject, predicate, object]).delete();
  }

  /**
   * Get all triples for a subject
   * @param subject The subject ID
   * @returns Array of triples
   */
  async getTriplesBySubject(subject: string): Promise<TripleProjection[]> {
    return await this.triples.where('subject').equals(subject).toArray();
  }

  /**
   * Get all triples for an object
   * @param object The object ID
   * @returns Array of triples
   */
  async getTriplesByObject(object: string): Promise<TripleProjection[]> {
    console.log('getTriplesByObject called with object:', object);
    try {
      const result = await this.triples.where('object').equals(object).toArray();
      console.log('getTriplesByObject result:', result);
      return result;
    } catch (error) {
      console.error('Error in getTriplesByObject:', error);
      throw error;
    }
  }

  /**
   * Get items for a specific list
   * @param listId The list ID
   * @returns Array of item projections
   */
  async getItemsForList(listId: string): Promise<ItemProjection[]> {
    console.log('getItemsForList called with listId:', listId);
    
    try {
      const triples = await this.getTriplesByObject(listId);
      console.log('Found triples:', triples);
      
      const itemIds = triples
        .filter(t => t.predicate === 'CONTAINS' || t.predicate === 'belongs_to')
        .map(t => t.subject);
      
      console.log('Filtered item IDs:', itemIds);
      
      const items: ItemProjection[] = [];
      for (const itemId of itemIds) {
        const item = await this.itemProjections.get(itemId);
        if (item) {
          items.push(item);
        }
      }
      
      console.log('Found items:', items);
      return items;
    } catch (error) {
      console.error('Error in getItemsForList:', error);
      
      // If the error is about missing object store, return empty array
      if (error instanceof Error && error.message.includes('object store was not found')) {
        console.warn('Triples table not found, returning empty array');
        return [];
      }
      
      throw error;
    }
  }

  /**
   * Get lists for a specific item
   * @param itemId The item ID
   * @returns Array of list projections
   */
  async getListsForItem(itemId: string): Promise<ListProjection[]> {
    const triples = await this.getTriplesBySubject(itemId);
    const listIds = triples
      .filter(t => t.predicate === 'CONTAINS' || t.predicate === 'belongs_to')
      .map(t => t.object);
    
    const lists: ListProjection[] = [];
    for (const listId of listIds) {
      const list = await this.listProjections.get(listId);
      if (list) {
        lists.push(list);
      }
    }
    
    return lists;
  }

  /**
   * Clear all data from the database (useful for development/testing)
   */
  async clearAllData(): Promise<void> {
    console.log('Clearing all database data...');
    await this.listEvents.clear();
    await this.itemEvents.clear();
    await this.listProjections.clear();
    await this.itemProjections.clear();
    
    // Only clear triples if the table exists
    try {
      await this.triples.clear();
    } catch (error) {
      console.log('Triples table does not exist, skipping clear');
    }
    
    console.log('Database cleared successfully');
  }

  /**
   * Check if database needs to be recreated due to schema changes
   */
  async checkAndRecreateIfNeeded(): Promise<void> {
    try {
      // Try to access the triples table to see if it exists
      await this.triples.count();
      console.log('Database schema is up to date');
    } catch (error) {
      console.warn('Database schema is outdated, deleting and recreating...', error);
      
      // Close the current database
      this.close();
      
      // Delete the entire database
      await Dexie.delete('ListicleDatabase');
      
      // Reopen the database (this will create it with the new schema)
      await this.open();
      
      console.log('Database recreated with new schema');
    }
  }
}

// Export singleton database instance
export const db = new ListicleDatabase();
