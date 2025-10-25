import { AggregateRoot } from '../common/AggregateRoot';
import { Entity } from '../common/Entity';
import { DomainEvent } from '../common/DomainEvent';
import { ListMetadata } from './ListMetadata';
import {
  createListCreatedEvent,
  createListUpdatedEvent,
  createListDeletedEvent,
} from './ListEvents';
import { TripleEvent, createTripleEvent, Predicate } from '../common/TripleEvent';

/**
 * Generic List Aggregate Root
 * Manages a collection of entities using RDF-style triple relationships
 * @template T The type of entities this list contains (must extend Entity)
 */
export class List<T extends Entity> extends AggregateRoot {
  private _metadata: ListMetadata;
  private _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Public constructor for creating new lists
   * @param name The name of the list
   * @param icon The icon for the list
   * @param color The color of the list
   * @param description Optional description for the list
   * @param id Optional ID (auto-generated if not provided)
   * @param version Optional version (defaults to 1)
   */
  constructor(name: string, icon: string, color: string, description?: string, id?: string, version: number = 1) {
    super(id || List.generateId(), version);
    this._metadata = new ListMetadata(name, icon, color, description);
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Static factory method to create a new list with event emission
   * @param name The name of the list
   * @param icon The icon for the list
   * @param color The color of the list
   * @param description Optional description for the list
   * @returns A new List instance with ListCreatedEvent emitted
   */
  static create<T extends Entity>(
    name: string,
    icon: string,
    color: string,
    description?: string
  ): List<T> {
    const list = new List<T>(name, icon, color, description);
    
    const event = createListCreatedEvent(
      list,
      list.id,
      list.sequenceNo + 1
    );
    
    list.applyEvent(event);
    return list;
  }

  /**
   * Static factory method to reconstruct a list from events
   * @param id The list ID
   * @param events Array of domain events to replay
   * @returns A reconstructed List instance
   */
  static fromEvents<T extends Entity>(id: string, events: DomainEvent[]): List<T> {
    const list = new List<T>('', '', '', undefined, id, 1);
    list.hydrateAggregate(events);
    return list;
  }

  /**
   * Renames the list
   * @param newName The new name for the list
   */
  rename(newName: string): void {
    const oldName = this._metadata.name;
    if (oldName === newName) {
      return; // No change needed
    }

    // Update the metadata
    this._metadata = this._metadata.withName(newName);
    this._updatedAt = new Date();

    const event = createListUpdatedEvent(
      this,
      this.id,
      this.sequenceNo + 1
    );
    
    this.applyEvent(event);
  }

  /**
   * Changes the list icon
   * @param newIcon The new icon for the list
   */
  changeIcon(newIcon: string): void {
    const oldIcon = this._metadata.icon;
    if (oldIcon === newIcon) {
      return; // No change needed
    }

    // Update the metadata
    this._metadata = this._metadata.withIcon(newIcon);
    this._updatedAt = new Date();

    const event = createListUpdatedEvent(
      this,
      this.id,
      this.sequenceNo + 1
    );
    
    this.applyEvent(event);
  }

  /**
   * Changes the list color
   * @param newColor The new color for the list
   */
  changeColor(newColor: string): void {
    const oldColor = this._metadata.color;
    if (oldColor === newColor) {
      return; // No change needed
    }

    // Update the metadata
    this._metadata = this._metadata.withColor(newColor);
    this._updatedAt = new Date();

    const event = createListUpdatedEvent(
      this,
      this.id,
      this.sequenceNo + 1
    );
    
    this.applyEvent(event);
  }

  /**
   * Deletes the list
   */
  delete(): void {
    // Update the state
    this._updatedAt = new Date();

    const event = createListDeletedEvent(
      this,
      this.id,
      this.sequenceNo + 1
    );
    
    this.applyEvent(event);
  }

  /**
   * Adds an item to the list
   * @param itemId The ID of the item to add
   */
  addItem(itemId: string): void {
    // Create a mock item for the TripleEvent (we only need the ID)
    const mockItem = { id: itemId } as T;
    
    // Create TripleEvent to link item to list
    const tripleEvent = createTripleEvent(
      this,
      Predicate.CONTAINS,
      mockItem,
      this.id,
      this.sequenceNo + 1
    );
    
    this.applyEvent(tripleEvent);
  }

  /**
   * Removes an item from the list
   * @param itemId The ID of the item to remove
   */
  removeItem(itemId: string): void {
    // Create a mock item for the TripleEvent (we only need the ID)
    const mockItem = { id: itemId } as T;
    
    // Create TripleEvent to unlink item from list
    const tripleEvent = createTripleEvent(
      this,
      Predicate.CONTAINS,
      mockItem,
      this.id,
      this.sequenceNo + 1
    );
    
    this.applyEvent(tripleEvent);
  }

  /**
   * Reorders an item in the list
   * @param itemId The ID of the item to reorder
   * @param newOrder The new order position
   */
  reorderItem(itemId: string, newOrder: number): void {
    // Create a mock item for the TripleEvent
    const mockItem = { id: itemId } as T;
    
    // Create TripleEvent to update ordering
    const tripleEvent = createTripleEvent(
      this,
      Predicate.ORDERED_BY,
      mockItem,
      this.id,
      this.sequenceNo + 1
    );
    
    this.applyEvent(tripleEvent);
  }

  // Getters for readonly access to internal state
  get name(): string {
    return this._metadata.name;
  }

  get icon(): string {
    return this._metadata.icon;
  }

  get color(): string {
    return this._metadata.color;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get metadata(): ListMetadata {
    return this._metadata;
  }

  /**
   * Applies domain events to update the aggregate state
   * @param event The domain event to apply
   */
  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case 'ListCreated':
        this.applyListCreated(event);
        break;
      case 'ListUpdated':
        this.applyListUpdated(event);
        break;
      case 'ListDeleted':
        this.applyListDeleted(event);
        break;
      case 'TripleEvent':
        this.applyTripleEvent(event);
        break;
      default:
        // Unknown event type - ignore
        break;
    }
  }

  private applyListCreated(event: DomainEvent): void {
    const list = event.data as List<any>;
    this._metadata = list._metadata;
    this._createdAt = event.timestamp;
    this._updatedAt = event.timestamp;
  }

  private applyListUpdated(event: DomainEvent): void {
    const list = event.data as List<any>;
    this._metadata = list._metadata;
    this._updatedAt = event.timestamp;
  }

  private applyListDeleted(event: DomainEvent): void {
    this._updatedAt = event.timestamp;
  }

  private applyTripleEvent(event: DomainEvent): void {
    // TripleEvents are handled by projection handlers, not by the aggregate itself
    // The aggregate only emits these events for relationship management
    // No local state changes needed - pure event sourcing approach
    this._updatedAt = event.timestamp;
  }

  /**
   * Generates a unique ID for new lists
   * @returns A unique string ID
   */
  private static generateId(): string {
    return `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
