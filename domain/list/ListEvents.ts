import { DomainEvent, createDomainEvent } from '../common/DomainEvent';
import { List } from './List';

// Simple CRUD events for List domain - KISS approach
// Each event contains the complete domain entity as payload

/**
 * Creates a ListCreated event
 * @param list The List entity that was created
 * @param aggregateId The aggregate ID
 * @param sequenceNo The sequence number
 * @returns DomainEvent for list creation
 */
export function createListCreatedEvent(
  list: List<any>,
  aggregateId: string,
  sequenceNo: number
): DomainEvent<List<any>> {
  return createDomainEvent('ListCreated', list, aggregateId, sequenceNo);
}

/**
 * Creates a ListUpdated event
 * @param list The updated List entity
 * @param aggregateId The aggregate ID
 * @param sequenceNo The sequence number
 * @returns DomainEvent for list update
 */
export function createListUpdatedEvent(
  list: List<any>,
  aggregateId: string,
  sequenceNo: number
): DomainEvent<List<any>> {
  return createDomainEvent('ListUpdated', list, aggregateId, sequenceNo);
}

/**
 * Creates a ListDeleted event
 * @param list The deleted List entity
 * @param aggregateId The aggregate ID
 * @param sequenceNo The sequence number
 * @returns DomainEvent for list deletion
 */
export function createListDeletedEvent(
  list: List<any>,
  aggregateId: string,
  sequenceNo: number
): DomainEvent<List<any>> {
  return createDomainEvent('ListDeleted', list, aggregateId, sequenceNo);
}