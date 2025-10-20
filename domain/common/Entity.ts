import { DomainEvent } from './DomainEvent';

/**
 * Abstract base class for domain entities with event sourcing capabilities
 * 
 * This class provides the foundation for implementing Domain Driven Design
 * entities that use event sourcing to maintain their state and history.
 */
export abstract class Entity {
  /** Entity identifier */
  readonly #id: string;
  
  /** Current sequence number (auto-incremented with each event) */
  #sequenceNo: number;
  
  /** Entity shape version */
  readonly #version: number;
  
  /** All committed events for this entity */
  #events: DomainEvent[] = [];
  
  /** New events since last save (uncommitted) */
  #uncommittedEvents: DomainEvent[] = [];

  /**
   * Constructor for Entity
   * @param id Entity identifier
   * @param version Entity shape version
   */
  constructor(id: string, version: number = 1) {
    this.#id = id;
    this.#version = version;
    this.#sequenceNo = 0;
  }

  /**
   * Getter for entity ID
   */
  get id(): string {
    return this.#id;
  }

  /**
   * Getter for current sequence number
   */
  get sequenceNo(): number {
    return this.#sequenceNo;
  }

  /**
   * Getter for entity version
   */
  get version(): number {
    return this.#version;
  }

  /**
   * Getter for uncommitted events (returns a copy)
   */
  get uncommittedEvents(): readonly DomainEvent[] {
    return [...this.#uncommittedEvents];
  }

  /**
   * Applies an event to the entity
   * This method handles the infrastructure concerns of event sourcing
   * @param event The domain event to apply
   */
  protected applyEvent(event: DomainEvent): void {
    // Increment sequence number
    this.#sequenceNo++;
    
    // Apply the event using the template method
    this.apply(event);
    
    // Add to uncommitted events
    this.#uncommittedEvents.push(event);
  }

  /**
   * Template method for applying domain events
   * Child classes should override this method to handle specific event types
   * @param event The domain event to apply
   */
  protected apply(event: DomainEvent): void {
    // Default implementation does nothing
    // Child classes should override this method
  }

  /**
   * Hydrates the entity from a list of events
   * This is used when loading an entity from the event store
   * @param events Array of domain events to replay
   */
  hydrate(events: DomainEvent[]): void {
    // Clear current state
    this.#events = [];
    this.#uncommittedEvents = [];
    this.#sequenceNo = 0;
    
    // Replay all events
    for (const event of events) {
      this.apply(event);
      this.#events.push(event);
      this.#sequenceNo = event.sequenceNo;
    }
  }

  /**
   * Marks all uncommitted events as committed
   * This should be called after successfully persisting events
   */
  markEventsAsCommitted(): void {
    this.#events.push(...this.#uncommittedEvents);
    this.#uncommittedEvents = [];
  }
}
