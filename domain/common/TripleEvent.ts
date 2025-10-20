import { DomainEvent, createDomainEvent } from './DomainEvent';
import { Entity } from './Entity';

/**
 * Standard predicates for RDF-style triple relationships
 */
export enum Predicate {
  /** List contains an item */
  CONTAINS = 'contains',
  /** Defines item ordering within a list */
  ORDERED_BY = 'ordered_by',
  /** Item belongs to a list */
  BELONGS_TO = 'belongs_to',
  /** Item is tagged with a category */
  TAGGED_WITH = 'tagged_with',
  /** Item is related to another item */
  RELATED_TO = 'related_to',
}

/**
 * Triple Event interface for RDF-style relationships
 * Represents a subject-predicate-object relationship between entities
 */
export interface TripleEvent extends DomainEvent<{
  subject: Entity;
  predicate: Predicate;
  object: Entity;
}> {
  readonly type: 'TripleEvent';
}

/**
 * Factory function to create triple events
 * @param subject The source entity
 * @param predicate The relationship type
 * @param object The target entity
 * @param aggregateId ID of the aggregate this event belongs to
 * @param sequenceNo Sequence number for ordering
 * @returns TripleEvent instance
 */
export function createTripleEvent(
  subject: Entity,
  predicate: Predicate,
  object: Entity,
  aggregateId: string,
  sequenceNo: number
): TripleEvent {
  return {
    type: 'TripleEvent',
    data: {
      subject,
      predicate,
      object,
    },
    timestamp: new Date(),
    aggregateId,
    sequenceNo,
  };
}

