import { AggregateRoot } from '../common/AggregateRoot';
import { Entity } from '../common/Entity';
import { DomainEvent } from '../common/DomainEvent';
import { createDomainEvent } from '../common/DomainEvent';

/**
 * Item Aggregate Root
 * Represents a scraped item with JSON-LD data and normalized fields
 */
export class Item extends AggregateRoot {
  private _id: string; // URN/URL
  private _name: string;
  private _url: string;
  private _image?: string;
  private _description?: string;
  private _type: string; // JSON-LD @type
  private _jsonLd: any; // Full JSON-LD object
  private _createdAt: Date;
  private _updatedAt: Date;
  private _deleted: boolean;

  /**
   * Private constructor for creating new items
   * @param id The URN/URL of the item
   * @param name The name/title of the item
   * @param url The URL of the item
   * @param type The JSON-LD @type
   * @param jsonLd The full JSON-LD object
   * @param image Optional image URL
   * @param description Optional description
   * @param version Optional version (defaults to 1)
   */
  constructor(
    id: string,
    name: string,
    url: string,
    type: string,
    jsonLd: any,
    image?: string,
    description?: string,
    version: number = 1
  ) {
    super(id, version);
    this._id = id;
    this._name = name;
    this._url = url;
    this._type = type;
    this._jsonLd = jsonLd;
    this._image = image;
    this._description = description;
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this._deleted = false;
  }

  /**
   * Static factory method to create a new item with event emission
   * @param id The URN/URL of the item
   * @param name The name/title of the item
   * @param url The URL of the item
   * @param type The JSON-LD @type
   * @param jsonLd The full JSON-LD object
   * @param image Optional image URL
   * @param description Optional description
   * @returns A new Item instance with ItemCreated event emitted
   */
  static create(
    id: string,
    name: string,
    url: string,
    type: string,
    jsonLd: any,
    image?: string,
    description?: string
  ): Item {
    const item = new Item(id, name, url, type, jsonLd, image, description);
    
    const event = createDomainEvent(
      'ItemCreated',
      item,
      item.id,
      item.sequenceNo + 1
    );
    
    item.applyEvent(event);
    return item;
  }

  /**
   * Static factory method to reconstruct an item from events
   * @param id The item ID
   * @param events Array of domain events to replay
   * @returns A reconstructed Item instance
   */
  static fromEvents(id: string, events: DomainEvent[]): Item {
    const item = new Item(id, '', '', '', {}, undefined, undefined, 1);
    item.hydrateAggregate(events);
    return item;
  }

  /**
   * Updates the item metadata
   * @param updates Partial updates for name, image, description
   */
  updateMetadata(updates: { name?: string; image?: string; description?: string }): void {
    if (this._deleted) {
      throw new Error('Cannot update a deleted item');
    }

    let hasChanges = false;
    const changes: any = {};

    if (updates.name !== undefined && updates.name !== this._name) {
      this._name = updates.name;
      changes.name = updates.name;
      hasChanges = true;
    }

    if (updates.image !== undefined && updates.image !== this._image) {
      this._image = updates.image;
      changes.image = updates.image;
      hasChanges = true;
    }

    if (updates.description !== undefined && updates.description !== this._description) {
      this._description = updates.description;
      changes.description = updates.description;
      hasChanges = true;
    }

    if (hasChanges) {
      this._updatedAt = new Date();
      const event = createDomainEvent(
        'ItemUpdated',
        { ...this.toSnapshot(), ...changes },
        this.id,
        this.sequenceNo + 1
      );
      
      this.applyEvent(event);
    }
  }

  /**
   * Updates the JSON-LD data
   * @param jsonLd The new JSON-LD object
   */
  updateJsonLd(jsonLd: any): void {
    if (this._deleted) {
      throw new Error('Cannot update a deleted item');
    }

    if (JSON.stringify(jsonLd) === JSON.stringify(this._jsonLd)) {
      return; // No change needed
    }

    this._jsonLd = jsonLd;
    this._updatedAt = new Date();

    const event = createDomainEvent(
      'ItemUpdated',
      { ...this.toSnapshot(), jsonLd },
      this.id,
      this.sequenceNo + 1
    );
    
    this.applyEvent(event);
  }

  /**
   * Marks the item as deleted
   */
  delete(): void {
    if (this._deleted) {
      return; // Already deleted
    }

    this._deleted = true;
    this._updatedAt = new Date();

    const event = createDomainEvent(
      'ItemDeleted',
      this.toSnapshot(),
      this.id,
      this.sequenceNo + 1
    );
    
    this.applyEvent(event);
  }

  /**
   * Creates a snapshot of the current item state
   * @returns Object containing all item properties
   */
  toSnapshot(): any {
    return {
      id: this._id,
      name: this._name,
      url: this._url,
      image: this._image,
      description: this._description,
      type: this._type,
      jsonLd: this._jsonLd,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      deleted: this._deleted,
    };
  }

  // Getters for readonly access to internal state
  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get url(): string {
    return this._url;
  }

  get image(): string | undefined {
    return this._image;
  }

  get description(): string | undefined {
    return this._description;
  }

  get type(): string {
    return this._type;
  }

  get jsonLd(): any {
    return this._jsonLd;
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
}
