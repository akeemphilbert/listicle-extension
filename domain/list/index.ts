// Export the main List aggregate root
export { List } from './List';

// Export all event factory functions
export {
  createListCreatedEvent,
  createListRenamedEvent,
  createListIconChangedEvent,
  createListColorChangedEvent,
  createListDeletedEvent,
  createItemAddedEvent,
  createItemRemovedEvent,
  createItemReorderedEvent,
} from './ListEvents';

// Export value objects
export { ListMetadata } from './ListMetadata';
export { ItemReference } from './ItemReference';
