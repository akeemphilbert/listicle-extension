import { List } from '../domain/list/List';
import { DomainEvent } from '../domain/common/DomainEvent';
import { useEventStore } from '../stores/eventStore';

/**
 * Application service that orchestrates List domain entity and EventStore
 * Provides high-level operations for list management using event sourcing
 */
export class ListService {
  private _eventStore: any = null;

  private get eventStore() {
    if (!this._eventStore) {
      this._eventStore = useEventStore();
    }
    return this._eventStore;
  }

  /**
   * Create a new list
   * @param name The name of the list
   * @param icon The icon for the list
   * @param color The color of the list
   * @param description Optional description for the list
   * @returns The created list or null if creation failed
   */
  async createList(
    name: string,
    icon: string,
    color: string,
    description?: string
  ): Promise<List<any> | null> {
    try {
      // Create the domain entity using the factory method
      const list = List.create(name, icon, color, description);
      
      // Get uncommitted events from the aggregate
      const uncommittedEvents = list.getAllUncommittedEvents();
      
      // Append events to the event store
      await this.eventStore.appendEvents(uncommittedEvents);
      
      // Mark events as committed
      list.markAllEventsAsCommitted();
      
      return list;
    } catch (error) {
      console.error('Error creating list:', error);
      return null;
    }
  }

  /**
   * Update an existing list
   * @param id The ID of the list to update
   * @param updates Partial updates to apply
   * @returns True if update was successful, false otherwise
   */
  async updateList(id: string, updates: {
    name?: string;
    icon?: string;
    color?: string;
    description?: string;
  }): Promise<boolean> {
    try {
      // Load the list from events
      const list = await this.loadListFromEvents(id);
      if (!list) {
        console.error(`List with ID ${id} not found`);
        return false;
      }

      // Apply updates based on what's provided
      if (updates.name !== undefined && updates.name !== list.name) {
        list.rename(updates.name);
      }
      
      if (updates.icon !== undefined && updates.icon !== list.icon) {
        list.changeIcon(updates.icon);
      }
      
      if (updates.color !== undefined && updates.color !== list.color) {
        list.changeColor(updates.color);
      }

      // Get uncommitted events from the aggregate
      const uncommittedEvents = list.getAllUncommittedEvents();
      
      if (uncommittedEvents.length > 0) {
        // Append events to the event store
        await this.eventStore.appendEvents(uncommittedEvents);
        
        // Mark events as committed
        list.markAllEventsAsCommitted();
      }

      return true;
    } catch (error) {
      console.error('Error updating list:', error);
      return false;
    }
  }

  /**
   * Delete a list
   * @param id The ID of the list to delete
   * @returns True if deletion was successful, false otherwise
   */
  async deleteList(id: string): Promise<boolean> {
    try {
      console.log('deleteList called with ID:', id);
      
      // Load the list from events
      const list = await this.loadListFromEvents(id);
      console.log('Loaded list from events:', list);
      
      if (!list) {
        console.error(`List with ID ${id} not found`);
        return false;
      }

      // Delete the list
      console.log('Calling list.delete()...');
      list.delete();

      // Get uncommitted events from the aggregate
      const uncommittedEvents = list.getAllUncommittedEvents();
      console.log('Uncommitted events:', uncommittedEvents);
      
      // Append events to the event store
      await this.eventStore.appendEvents(uncommittedEvents);
      
      // Mark events as committed
      list.markAllEventsAsCommitted();

      console.log('List deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting list:', error);
      return false;
    }
  }

  /**
   * Load a list from events by reconstructing it
   * @param id The ID of the list to load
   * @returns The reconstructed list or null if not found
   */
  async loadListFromEvents(id: string): Promise<List<any> | null> {
    try {
      console.log('loadListFromEvents called with ID:', id);
      
      // Get all events for this aggregate
      const events = await this.eventStore.getEventsByAggregateId(id);
      console.log('Found events for list:', events.length, events);
      
      if (events.length === 0) {
        console.log('No events found for list ID:', id);
        return null;
      }

      // Reconstruct the list from events
      console.log('Reconstructing list from events...');
      const list = List.fromEvents(id, events);
      console.log('Reconstructed list:', list);
      return list;
    } catch (error) {
      console.error('Error loading list from events:', error);
      return null;
    }
  }

  /**
   * Get all lists by reconstructing them from events
   * @returns Array of reconstructed lists
   */
  async getAllListsFromEvents(): Promise<List<any>[]> {
    try {
      const allEvents = await this.eventStore.getAllEvents();
      
      // Group events by aggregate ID
      const eventsByAggregate = new Map<string, DomainEvent[]>();
      allEvents.forEach((event: DomainEvent) => {
        if (!eventsByAggregate.has(event.aggregateId)) {
          eventsByAggregate.set(event.aggregateId, []);
        }
        eventsByAggregate.get(event.aggregateId)!.push(event);
      });

      // Reconstruct each list
      const lists: List<any>[] = [];
      for (const [aggregateId, events] of eventsByAggregate) {
        try {
          const list = List.fromEvents(aggregateId, events);
          lists.push(list);
        } catch (error) {
          console.error(`Error reconstructing list ${aggregateId}:`, error);
        }
      }

      return lists;
    } catch (error) {
      console.error('Error loading all lists from events:', error);
      return [];
    }
  }

  /**
   * Initialize the service by ensuring the event store is initialized
   */
  async initialize(): Promise<void> {
    await this.eventStore.initialize();
  }
}

// Export a singleton instance
export const listService = new ListService();
