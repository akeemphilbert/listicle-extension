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
  private _deleted: boolean;

  /**
   * Public constructor for creating new lists
   * @param name The name of the list
   * @param icon The icon for the list
   * @param color The color of the list
   * @param id Optional ID (auto-generated if not provided)
   * @param version Optional version (defaults to 1)
   */
  constructor(name: string, icon: string, color: string, id?: string, version: number = 1) {
    super(id || List.generateId(), version);
    this._metadata = new ListMetadata(name, icon, color);
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this._deleted = false;
  }

  /**
   * Static factory method to create a new list with event emission
   * @param name The name of the list
   * @param icon The icon for the list
   * @param color The color of the list
   * @returns A new List instance with ListCreatedEvent emitted
   */
  static create<T extends Entity>(
    name: string,
    icon: string,
    color: string
  ): List<T> {
    const list = new List<T>(name, icon, color);
    
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
    const list = new List<T>('', '', '', id, 1);
    list.hydrateAggregate(events);
    return list;
  }

  /**
   * Renames the list
   * @param newName The new name for the list
   */
  rename(newName: string): void {
    if (this._deleted) {
      throw new Error('Cannot rename a deleted list');
    }
    
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
    if (this._deleted) {
      throw new Error('Cannot change icon of a deleted list');
    }
    
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
    if (this._deleted) {
      throw new Error('Cannot change color of a deleted list');
    }
    
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
    if (this._deleted) {
      return; // Already deleted
    }

    // Update the state
    this._deleted = true;
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
   * @param item The item to add
   */
  addItem(item: T): void {
    if (this._deleted) {
      throw new Error('Cannot add items to a deleted list');
    }

    // Create TripleEvent to link item to list
    const tripleEvent = createTripleEvent(
      this,
      Predicate.CONTAINS,
      item,
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
    if (this._deleted) {
      throw new Error('Cannot remove items from a deleted list');
    }

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
    if (this._deleted) {
      throw new Error('Cannot reorder items in a deleted list');
    }

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

  get deleted(): boolean {
    return this._deleted;
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
    this._deleted = false;
  }

  private applyListUpdated(event: DomainEvent): void {
    const list = event.data as List<any>;
    this._metadata = list._metadata;
    this._updatedAt = event.timestamp;
    this._deleted = list._deleted;
  }

  private applyListDeleted(event: DomainEvent): void {
    const list = event.data as List<any>;
    this._deleted = list._deleted;
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
