import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { DomainEvent } from '../domain/common/DomainEvent';
import { db } from '../services/database';

export const useEventStore = defineStore('eventStore', () => {
  const isInitialized = ref(false);

  /**
   * Initialize the event store
   */
  const initialize = async (): Promise<void> => {
    if (isInitialized.value) return;

    try {
      // Dexie database is automatically initialized
      isInitialized.value = true;
    } catch (error) {
      console.error('Failed to initialize event store:', error);
      isInitialized.value = true;
    }
  };

  /**
   * Append a new event to the store
   * @param event The domain event to append
   */
  const appendEvent = async (event: DomainEvent): Promise<void> => {
    // Determine which event store to use based on event type
    if (event.type.startsWith('List')) {
      await db.listEvents.add(event);
      await db.updateListProjection(event);
    } else if (event.type.startsWith('Item')) {
      await db.itemEvents.add(event);
      await db.updateItemProjection(event);
    } else if (event.type === 'TripleEvent') {
      await db.listEvents.add(event); // Store triple events in listEvents for now
      await db.handleTripleEvent(event);
    }
  };

  /**
   * Append multiple events to the store
   * @param newEvents Array of domain events to append
   */
  const appendEvents = async (newEvents: DomainEvent[]): Promise<void> => {
    const listEvents: DomainEvent[] = [];
    const itemEvents: DomainEvent[] = [];
    const tripleEvents: DomainEvent[] = [];

    // Categorize events
    for (const event of newEvents) {
      if (event.type.startsWith('List')) {
        listEvents.push(event);
      } else if (event.type.startsWith('Item')) {
        itemEvents.push(event);
      } else if (event.type === 'TripleEvent') {
        tripleEvents.push(event);
      }
    }

    // Process each category
    if (listEvents.length > 0) {
      await db.listEvents.bulkAdd(listEvents);
      for (const event of listEvents) {
        await db.updateListProjection(event);
      }
    }

    if (itemEvents.length > 0) {
      await db.itemEvents.bulkAdd(itemEvents);
      for (const event of itemEvents) {
        await db.updateItemProjection(event);
      }
    }

    if (tripleEvents.length > 0) {
      await db.listEvents.bulkAdd(tripleEvents); // Store in listEvents for now
      for (const event of tripleEvents) {
        await db.handleTripleEvent(event);
      }
    }
  };

  /**
   * Get all events for a specific aggregate
   * @param aggregateId The aggregate ID to filter by
   * @returns Array of events for the aggregate
   */
  const getEventsByAggregateId = async (aggregateId: string): Promise<DomainEvent[]> => {
    const listEvents = await db.listEvents.where('aggregateId').equals(aggregateId).toArray();
    const itemEvents = await db.itemEvents.where('aggregateId').equals(aggregateId).toArray();
    return [...listEvents, ...itemEvents].sort((a, b) => a.sequenceNo - b.sequenceNo);
  };

  /**
   * Get all events
   * @returns Array of all events
   */
  const getAllEvents = async (): Promise<DomainEvent[]> => {
    const listEvents = await db.listEvents.toArray();
    const itemEvents = await db.itemEvents.toArray();
    return [...listEvents, ...itemEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  /**
   * Get events of a specific type
   * @param eventType The type of events to filter by
   * @returns Array of events of the specified type
   */
  const getEventsByType = async (eventType: string): Promise<DomainEvent[]> => {
    const listEvents = await db.listEvents.where('type').equals(eventType).toArray();
    const itemEvents = await db.itemEvents.where('type').equals(eventType).toArray();
    return [...listEvents, ...itemEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  /**
   * Get the latest event for a specific aggregate
   * @param aggregateId The aggregate ID
   * @returns The latest event or null if none found
   */
  const getLatestEventForAggregate = async (aggregateId: string): Promise<DomainEvent | null> => {
    const events = await getEventsByAggregateId(aggregateId);
    if (events.length === 0) return null;
    
    return events.reduce((latest, current) => 
      current.sequenceNo > latest.sequenceNo ? current : latest
    );
  };

  /**
   * Clear all events (useful for testing or reset)
   */
  const clearEvents = async (): Promise<void> => {
    await db.listEvents.clear();
    await db.itemEvents.clear();
  };

  /**
   * Get event count
   */
  const getEventCount = async (): Promise<number> => {
    const listCount = await db.listEvents.count();
    const itemCount = await db.itemEvents.count();
    return listCount + itemCount;
  };

  /**
   * Check if events table is empty
   */
  const isEmpty = async (): Promise<boolean> => {
    const count = await getEventCount();
    return count === 0;
  };

  return {
    // State
    isInitialized: computed(() => isInitialized.value),
    
    // Actions
    initialize,
    appendEvent,
    appendEvents,
    getEventsByAggregateId,
    getAllEvents,
    getEventsByType,
    getLatestEventForAggregate,
    clearEvents,
    getEventCount,
    isEmpty,
  };
});
