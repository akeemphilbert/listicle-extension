import { describe, it, expect, beforeEach } from 'vitest';
import { List } from './List';
import { Entity } from '../common/Entity';
import { ListMetadata } from './ListMetadata';
import { ItemReference } from './ItemReference';

// Mock Entity for testing
class MockEntity extends Entity {
  constructor(id: string, public name: string) {
    super(id);
  }
}

describe('List', () => {
  describe('constructor', () => {
    const testCases = [
      {
        name: 'creates list with valid parameters',
        input: { name: 'Test List', icon: '📝', color: '#ff6b6b' },
        expected: { name: 'Test List', icon: '📝', color: '#ff6b6b' }
      },
      {
        name: 'creates list with custom ID',
        input: { name: 'Custom List', icon: '🎯', color: 'blue', id: 'custom-id' },
        expected: { name: 'Custom List', icon: '🎯', color: 'blue' }
      },
      {
        name: 'creates list with version',
        input: { name: 'Versioned List', icon: '📊', color: 'green', id: 'v-list', version: 5 },
        expected: { name: 'Versioned List', icon: '📊', color: 'green' }
      }
    ];

    testCases.forEach(tc => {
      it(tc.name, () => {
        const list = new List<MockEntity>(
          tc.input.name,
          tc.input.icon,
          tc.input.color,
          tc.input.id,
          tc.input.version
        );

        expect(list.name).toBe(tc.expected.name);
        expect(list.icon).toBe(tc.expected.icon);
        expect(list.color).toBe(tc.expected.color);
        expect(list.itemCount).toBe(0);
        expect(list.getItemReferences()).toEqual([]);
      });
    });

    it('throws error for invalid metadata', () => {
      expect(() => {
        new List<MockEntity>('', '📝', '#ff6b6b');
      }).toThrow('List name cannot be empty');
    });
  });

  describe('static create', () => {
    it('creates list and emits ListCreated event', () => {
      const list = List.create<MockEntity>('New List', '🆕', '#00ff00');
      
      expect(list.name).toBe('New List');
      expect(list.icon).toBe('🆕');
      expect(list.color).toBe('#00ff00');
      expect(list.uncommittedEvents).toHaveLength(1);
      expect(list.uncommittedEvents[0].type).toBe('ListCreated');
    });
  });

  describe('rename', () => {
    let list: List<MockEntity>;

    beforeEach(() => {
      list = new List<MockEntity>('Original Name', '📝', '#ff6b6b');
    });

    const testCases = [
      {
        name: 'renames list successfully',
        input: 'New Name',
        expected: { name: 'New Name', eventsEmitted: 1 }
      },
      {
        name: 'does not emit event when name unchanged',
        input: 'Original Name',
        expected: { name: 'Original Name', eventsEmitted: 0 }
      }
    ];

    testCases.forEach(tc => {
      it(tc.name, () => {
        const initialEventCount = list.uncommittedEvents.length;
        
        list.rename(tc.input);
        
        expect(list.name).toBe(tc.expected.name);
        expect(list.uncommittedEvents.length - initialEventCount).toBe(tc.expected.eventsEmitted);
        
        if (tc.expected.eventsEmitted > 0) {
          const event = list.uncommittedEvents[list.uncommittedEvents.length - 1];
          expect(event.type).toBe('ListRenamed');
        }
      });
    });

  });

  describe('changeIcon', () => {
    let list: List<MockEntity>;

    beforeEach(() => {
      list = new List<MockEntity>('Test List', '📝', '#ff6b6b');
    });

    const testCases = [
      {
        name: 'changes icon successfully',
        input: '🎯',
        expected: { icon: '🎯', eventsEmitted: 1 }
      },
      {
        name: 'does not emit event when icon unchanged',
        input: '📝',
        expected: { icon: '📝', eventsEmitted: 0 }
      }
    ];

    testCases.forEach(tc => {
      it(tc.name, () => {
        const initialEventCount = list.uncommittedEvents.length;
        
        list.changeIcon(tc.input);
        
        expect(list.icon).toBe(tc.expected.icon);
        expect(list.uncommittedEvents.length - initialEventCount).toBe(tc.expected.eventsEmitted);
        
        if (tc.expected.eventsEmitted > 0) {
          const event = list.uncommittedEvents[list.uncommittedEvents.length - 1];
          expect(event.type).toBe('ListIconChanged');
        }
      });
    });

  });

  describe('changeColor', () => {
    let list: List<MockEntity>;

    beforeEach(() => {
      list = new List<MockEntity>('Test List', '📝', '#ff6b6b');
    });

    const testCases = [
      {
        name: 'changes color successfully',
        input: '#00ff00',
        expected: { color: '#00ff00', eventsEmitted: 1 }
      },
      {
        name: 'changes color to CSS color name',
        input: 'blue',
        expected: { color: 'blue', eventsEmitted: 1 }
      },
      {
        name: 'does not emit event when color unchanged',
        input: '#ff6b6b',
        expected: { color: '#ff6b6b', eventsEmitted: 0 }
      }
    ];

    testCases.forEach(tc => {
      it(tc.name, () => {
        const initialEventCount = list.uncommittedEvents.length;
        
        list.changeColor(tc.input);
        
        expect(list.color).toBe(tc.expected.color);
        expect(list.uncommittedEvents.length - initialEventCount).toBe(tc.expected.eventsEmitted);
        
        if (tc.expected.eventsEmitted > 0) {
          const event = list.uncommittedEvents[list.uncommittedEvents.length - 1];
          expect(event.type).toBe('ListColorChanged');
        }
      });
    });

  });

  describe('delete', () => {
    let list: List<MockEntity>;

    beforeEach(() => {
      list = new List<MockEntity>('Test List', '📝', '#ff6b6b');
    });

    const testCases = [
      {
        name: 'deletes list successfully',
        expected: { eventsEmitted: 1 }
      },
      {
        name: 'emits event on delete',
        setup: () => {},
        expected: { eventsEmitted: 1 }
      }
    ];

    testCases.forEach(tc => {
      it(tc.name, () => {
        if (tc.setup) tc.setup();
        
        const initialEventCount = list.uncommittedEvents.length;
        
        list.delete();
        
        expect(list.uncommittedEvents.length - initialEventCount).toBe(tc.expected.eventsEmitted);
        
        if (tc.expected.eventsEmitted > 0) {
          const event = list.uncommittedEvents[list.uncommittedEvents.length - 1];
          expect(event.type).toBe('ListDeleted');
        }
      });
    });
  });

  describe('addItem', () => {
    let list: List<MockEntity>;
    let item: MockEntity;

    beforeEach(() => {
      list = new List<MockEntity>('Test List', '📝', '#ff6b6b');
      item = new MockEntity('item-1', 'Test Item');
    });

    it('adds item successfully', () => {
      const initialEventCount = list.uncommittedEvents.length;
      
      list.addItem(item);
      
      expect(list.itemCount).toBe(1);
      expect(list.hasItem(item.id)).toBe(true);
      expect(list.uncommittedEvents.length - initialEventCount).toBe(1);
      
      const event = list.uncommittedEvents[list.uncommittedEvents.length - 1];
      expect(event.type).toBe('TripleEvent');
    });

    it('adds multiple items in order', () => {
      const item2 = new MockEntity('item-2', 'Item 2');
      const initialEventCount = list.uncommittedEvents.length;
      
      list.addItem(item);
      list.addItem(item2);
      
      expect(list.itemCount).toBe(2);
      expect(list.hasItem(item.id)).toBe(true);
      expect(list.hasItem(item2.id)).toBe(true);
      expect(list.uncommittedEvents.length - initialEventCount).toBe(2);
    });

    it('throws error when adding duplicate item', () => {
      list.addItem(item);
      
      expect(() => {
        list.addItem(item);
      }).toThrow(`Item ${item.id} is already in the list`);
    });

  });

  describe('removeItem', () => {
    let list: List<MockEntity>;
    let item: MockEntity;

    beforeEach(() => {
      list = new List<MockEntity>('Test List', '📝', '#ff6b6b');
      item = new MockEntity('item-1', 'Test Item');
      list.addItem(item);
    });

    it('removes item successfully', () => {
      const initialEventCount = list.uncommittedEvents.length;
      
      list.removeItem(item.id);
      
      expect(list.itemCount).toBe(0);
      expect(list.hasItem(item.id)).toBe(false);
      expect(list.uncommittedEvents.length - initialEventCount).toBe(1);
      
      const event = list.uncommittedEvents[list.uncommittedEvents.length - 1];
      expect(event.type).toBe('TripleEvent');
    });

    it('throws error when item not in list', () => {
      expect(() => {
        list.removeItem('non-existent-id');
      }).toThrow('Item non-existent-id is not in the list');
    });

  });

  describe('reorderItem', () => {
    let list: List<MockEntity>;
    let item1: MockEntity;
    let item2: MockEntity;

    beforeEach(() => {
      list = new List<MockEntity>('Test List', '📝', '#ff6b6b');
      item1 = new MockEntity('item-1', 'Item 1');
      item2 = new MockEntity('item-2', 'Item 2');
      list.addItem(item1);
      list.addItem(item2);
    });

    it('reorders item successfully', () => {
      const initialEventCount = list.uncommittedEvents.length;
      
      list.reorderItem(item1.id, 1);
      
      expect(list.uncommittedEvents.length - initialEventCount).toBe(1);
      
      const event = list.uncommittedEvents[list.uncommittedEvents.length - 1];
      expect(event.type).toBe('TripleEvent');
    });

    it('does not emit event when order unchanged', () => {
      const initialEventCount = list.uncommittedEvents.length;
      
      list.reorderItem(item1.id, 0);
      
      expect(list.uncommittedEvents.length - initialEventCount).toBe(0);
    });

    it('throws error when trying to reorder non-existent item', () => {
      expect(() => {
        list.reorderItem('non-existent-id', 1);
      }).toThrow('Item non-existent-id is not in the list');
    });

  });

  describe('getItemReferences', () => {
    let list: List<MockEntity>;

    beforeEach(() => {
      list = new List<MockEntity>('Test List', '📝', '#ff6b6b');
    });

    it('returns empty array when no items', () => {
      expect(list.getItemReferences()).toEqual([]);
    });

    it('returns items in correct order', () => {
      const item1 = new MockEntity('item-1', 'Item 1');
      const item2 = new MockEntity('item-2', 'Item 2');
      const item3 = new MockEntity('item-3', 'Item 3');
      
      list.addItem(item1);
      list.addItem(item2);
      list.addItem(item3);
      
      const references = list.getItemReferences();
      expect(references).toHaveLength(3);
      expect(references[0].itemId).toBe('item-1');
      expect(references[1].itemId).toBe('item-2');
      expect(references[2].itemId).toBe('item-3');
    });
  });

  describe('hasItem', () => {
    let list: List<MockEntity>;
    let item: MockEntity;

    beforeEach(() => {
      list = new List<MockEntity>('Test List', '📝', '#ff6b6b');
      item = new MockEntity('item-1', 'Test Item');
    });

    it('returns false when item not in list', () => {
      expect(list.hasItem(item.id)).toBe(false);
    });

    it('returns true when item in list', () => {
      list.addItem(item);
      expect(list.hasItem(item.id)).toBe(true);
    });
  });

  describe('event application', () => {
    let list: List<MockEntity>;

    beforeEach(() => {
      list = new List<MockEntity>('Test List', '📝', '#ff6b6b');
    });

    it('applies ListCreated event', () => {
      const event = {
        type: 'ListCreated',
        data: { name: 'Created List', icon: '🆕', color: '#00ff00' },
        timestamp: new Date(),
        aggregateId: list.id,
        sequenceNo: 1
      };
      
      list.apply(event);
      
      expect(list.name).toBe('Created List');
      expect(list.icon).toBe('🆕');
      expect(list.color).toBe('#00ff00');
    });

    it('applies ListRenamed event', () => {
      const event = {
        type: 'ListRenamed',
        data: { newName: 'Renamed List', oldName: 'Test List' },
        timestamp: new Date(),
        aggregateId: list.id,
        sequenceNo: 1
      };
      
      list.apply(event);
      
      expect(list.name).toBe('Renamed List');
    });

    it('applies TripleEvent for item addition', () => {
      const mockItem = new MockEntity('item-1', 'Test Item');
      const event = {
        type: 'TripleEvent',
        data: {
          subject: list,
          predicate: 'contains',
          object: mockItem,
          operation: 'add'
        },
        timestamp: new Date(),
        aggregateId: list.id,
        sequenceNo: 1
      };
      
      list.apply(event);
      
      expect(list.hasItem('item-1')).toBe(true);
      expect(list.itemCount).toBe(1);
    });
  });

  describe('boundary conditions', () => {
    let list: List<MockEntity>;

    beforeEach(() => {
      list = new List<MockEntity>('Test List', '📝', '#ff6b6b');
    });

    it('handles empty string operations gracefully', () => {
      expect(() => {
        list.rename('');
      }).toThrow('List name cannot be empty');
    });

    it('handles null/undefined gracefully', () => {
      expect(() => {
        new List<MockEntity>(null as any, '📝', '#ff6b6b');
      }).toThrow();
    });

    it('handles very long names', () => {
      const longName = 'a'.repeat(101);
      expect(() => {
        new List<MockEntity>(longName, '📝', '#ff6b6b');
      }).toThrow('List name cannot exceed 100 characters');
    });
  });

  describe('concurrency', () => {
    it('maintains consistency with rapid operations', () => {
      const list = new List<MockEntity>('Test List', '📝', '#ff6b6b');
      const items = Array.from({ length: 10 }, (_, i) => 
        new MockEntity(`item-${i}`, `Item ${i}`)
      );
      
      // Add items rapidly
      items.forEach(item => list.addItem(item));
      
      expect(list.itemCount).toBe(10);
      expect(list.getItemReferences()).toHaveLength(10);
      
      // Remove items rapidly
      items.forEach(item => list.removeItem(item.id));
      
      expect(list.itemCount).toBe(0);
      expect(list.getItemReferences()).toHaveLength(0);
    });
  });
});
