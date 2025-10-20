/**
 * Item Reference Value Object
 * Represents a lightweight reference to an item within a list
 * Stores the item ID, type, and ordering information
 */
export class ItemReference {
  private readonly _itemId: string;
  private readonly _itemType: string;
  private readonly _order: number;

  constructor(itemId: string, itemType: string, order: number) {
    this.validateItemId(itemId);
    this.validateItemType(itemType);
    this.validateOrder(order);
    
    this._itemId = itemId;
    this._itemType = itemType;
    this._order = order;
  }

  get itemId(): string {
    return this._itemId;
  }

  get itemType(): string {
    return this._itemType;
  }

  get order(): number {
    return this._order;
  }

  /**
   * Creates a new ItemReference with updated order
   */
  withOrder(newOrder: number): ItemReference {
    return new ItemReference(this._itemId, this._itemType, newOrder);
  }

  /**
   * Validates that the item ID is not empty
   */
  private validateItemId(itemId: string): void {
    if (!itemId || itemId.trim().length === 0) {
      throw new Error('Item ID cannot be empty');
    }
  }

  /**
   * Validates that the item type is not empty
   */
  private validateItemType(itemType: string): void {
    if (!itemType || itemType.trim().length === 0) {
      throw new Error('Item type cannot be empty');
    }
  }

  /**
   * Validates that the order is a non-negative number
   */
  private validateOrder(order: number): void {
    if (order < 0) {
      throw new Error('Item order cannot be negative');
    }
    if (!Number.isInteger(order)) {
      throw new Error('Item order must be an integer');
    }
  }

  /**
   * Checks equality with another ItemReference
   */
  equals(other: ItemReference): boolean {
    return this._itemId === other._itemId &&
           this._itemType === other._itemType &&
           this._order === other._order;
  }

  /**
   * Returns a string representation of the item reference
   */
  toString(): string {
    return `ItemReference(itemId="${this._itemId}", itemType="${this._itemType}", order=${this._order})`;
  }
}

