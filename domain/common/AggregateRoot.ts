import { Entity } from './Entity';
import { DomainEvent } from './DomainEvent';

/**
 * Abstract base class for aggregate roots in Domain Driven Design
 * 
 * An aggregate root is the entry point to an aggregate and is responsible
 * for maintaining consistency boundaries. It extends Entity to provide
 * event sourcing capabilities and manages child entities within the aggregate.
 */
export abstract class AggregateRoot extends Entity {
  /** Child entities within this aggregate */
  #childEntities: Entity[] = [];

  /**
   * Constructor for AggregateRoot
   * @param id Aggregate root identifier
   * @param version Aggregate root version
   */
  constructor(id: string, version: number = 1) {
    super(id, version);
  }

  /**
   * Adds a child entity to this aggregate root
   * @param childEntity The child entity to add to the aggregate
   */
  protected addChildEntity(childEntity: Entity): void {
    this.#childEntities.push(childEntity);
  }

  /**
   * Removes a child entity from this aggregate root
   * @param childEntity The child entity to remove from the aggregate
   */
  protected removeChildEntity(childEntity: Entity): void {
    const index = this.#childEntities.indexOf(childEntity);
    if (index > -1) {
      this.#childEntities.splice(index, 1);
    }
  }

  /**
   * Gets all child entities in this aggregate
   * @returns Readonly array of child entities
   */
  protected getChildEntities(): readonly Entity[] {
    return [...this.#childEntities];
  }

  /**
   * Collects all uncommitted events from this aggregate root and all its child entities
   * @returns Array of all uncommitted events in the aggregate
   */
  getAllUncommittedEvents(): DomainEvent[] {
    const allEvents: DomainEvent[] = [];
    
    // Add uncommitted events from this aggregate root
    allEvents.push(...this.uncommittedEvents);
    
    // Add uncommitted events from all child entities
    for (const childEntity of this.#childEntities) {
      allEvents.push(...childEntity.uncommittedEvents);
    }
    
    // Sort events by sequence number to maintain proper order
    return allEvents.sort((a, b) => a.sequenceNo - b.sequenceNo);
  }

  /**
   * Marks all events (from this aggregate root and all child entities) as committed
   * This should be called after successfully persisting the entire aggregate
   */
  markAllEventsAsCommitted(): void {
    // Mark events as committed for this aggregate root
    this.markEventsAsCommitted();
    
    // Mark events as committed for all child entities
    for (const childEntity of this.#childEntities) {
      childEntity.markEventsAsCommitted();
    }
  }

  /**
   * Hydrates the entire aggregate (root and all child entities) from events
   * @param events Array of domain events to replay
   */
  hydrateAggregate(events: DomainEvent[]): void {
    // Clear child entities
    this.#childEntities = [];
    
    // Hydrate this aggregate root
    this.hydrate(events);
    
    // Note: Child entities would need to be recreated based on domain logic
    // This is typically handled by the aggregate root's apply() method
    // when processing events that create child entities
  }

  /**
   * Gets the total count of uncommitted events across the entire aggregate
   * @returns Total number of uncommitted events
   */
  getUncommittedEventCount(): number {
    let count = this.uncommittedEvents.length;
    
    for (const childEntity of this.#childEntities) {
      count += childEntity.uncommittedEvents.length;
    }
    
    return count;
  }
}


