/**
 * Domain Event interface for event sourcing
 * @template T The type of data payload for the event
 */
export interface DomainEvent<T = unknown> {
  /** Event type discriminator */
  readonly type: string;
  
  /** Event payload data */
  readonly data: T;
  
  /** When the event occurred */
  readonly timestamp: Date;
  
  /** ID of the aggregate/entity this event belongs to */
  readonly aggregateId: string;
  
  /** Order of this event in the entity's history */
  readonly sequenceNo: number;
}

/**
 * Factory function to create domain events
 * @param type Event type
 * @param data Event data
 * @param aggregateId ID of the aggregate
 * @param sequenceNo Sequence number
 * @returns DomainEvent instance
 */
export function createDomainEvent<T>(
  type: string,
  data: T,
  aggregateId: string,
  sequenceNo: number
): DomainEvent<T> {
  return {
    type,
    data,
    timestamp: new Date(),
    aggregateId,
    sequenceNo,
  };
}


