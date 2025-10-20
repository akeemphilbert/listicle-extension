import { describe, it, expect } from 'vitest';
import { ListMetadata } from './ListMetadata';
import { ItemReference } from './ItemReference';

describe('ListMetadata', () => {
  describe('constructor', () => {
    const testCases = [
      {
        name: 'creates metadata with valid parameters',
        input: { name: 'Test List', icon: '📝', color: '#ff6b6b' },
        expected: { name: 'Test List', icon: '📝', color: '#ff6b6b' }
      },
      {
        name: 'creates metadata with CSS color name',
        input: { name: 'Blue List', icon: '🔵', color: 'blue' },
        expected: { name: 'Blue List', icon: '🔵', color: 'blue' }
      },
      {
        name: 'creates metadata with short hex color',
        input: { name: 'Short Hex', icon: '🎨', color: '#f0f' },
        expected: { name: 'Short Hex', icon: '🎨', color: '#f0f' }
      }
    ];

    testCases.forEach(tc => {
      it(tc.name, () => {
        const metadata = new ListMetadata(tc.input.name, tc.input.icon, tc.input.color);
        
        expect(metadata.name).toBe(tc.expected.name);
        expect(metadata.icon).toBe(tc.expected.icon);
        expect(metadata.color).toBe(tc.expected.color);
      });
    });
  });

  describe('validation', () => {
    const validationTestCases = [
      {
        name: 'throws error for empty name',
        input: { name: '', icon: '📝', color: '#ff6b6b' },
        expectedError: 'List name cannot be empty'
      },
      {
        name: 'throws error for whitespace-only name',
        input: { name: '   ', icon: '📝', color: '#ff6b6b' },
        expectedError: 'List name cannot be empty'
      },
      {
        name: 'throws error for name too long',
        input: { name: 'a'.repeat(101), icon: '📝', color: '#ff6b6b' },
        expectedError: 'List name cannot exceed 100 characters'
      },
      {
        name: 'throws error for empty icon',
        input: { name: 'Test', icon: '', color: '#ff6b6b' },
        expectedError: 'List icon cannot be empty'
      },
      {
        name: 'throws error for icon too long',
        input: { name: 'Test', icon: 'a'.repeat(51), color: '#ff6b6b' },
        expectedError: 'List icon cannot exceed 50 characters'
      },
      {
        name: 'throws error for empty color',
        input: { name: 'Test', icon: '📝', color: '' },
        expectedError: 'List color cannot be empty'
      },
      {
        name: 'throws error for invalid hex color',
        input: { name: 'Test', icon: '📝', color: '#gggggg' },
        expectedError: 'List color must be a valid hex color (#RRGGBB) or CSS color name'
      },
      {
        name: 'throws error for invalid color format',
        input: { name: 'Test', icon: '📝', color: 'not-a-color' },
        expectedError: 'List color must be a valid hex color (#RRGGBB) or CSS color name'
      }
    ];

    validationTestCases.forEach(tc => {
      it(tc.name, () => {
        expect(() => {
          new ListMetadata(tc.input.name, tc.input.icon, tc.input.color);
        }).toThrow(tc.expectedError);
      });
    });
  });

  describe('withName', () => {
    it('creates new metadata with updated name', () => {
      const original = new ListMetadata('Original', '📝', '#ff6b6b');
      const updated = original.withName('Updated');
      
      expect(updated.name).toBe('Updated');
      expect(updated.icon).toBe('📝');
      expect(updated.color).toBe('#ff6b6b');
      expect(original.name).toBe('Original'); // Original unchanged
    });

    it('validates new name', () => {
      const metadata = new ListMetadata('Original', '📝', '#ff6b6b');
      
      expect(() => {
        metadata.withName('');
      }).toThrow('List name cannot be empty');
    });
  });

  describe('withIcon', () => {
    it('creates new metadata with updated icon', () => {
      const original = new ListMetadata('Test', '📝', '#ff6b6b');
      const updated = original.withIcon('🎯');
      
      expect(updated.name).toBe('Test');
      expect(updated.icon).toBe('🎯');
      expect(updated.color).toBe('#ff6b6b');
      expect(original.icon).toBe('📝'); // Original unchanged
    });

    it('validates new icon', () => {
      const metadata = new ListMetadata('Test', '📝', '#ff6b6b');
      
      expect(() => {
        metadata.withIcon('');
      }).toThrow('List icon cannot be empty');
    });
  });

  describe('withColor', () => {
    it('creates new metadata with updated color', () => {
      const original = new ListMetadata('Test', '📝', '#ff6b6b');
      const updated = original.withColor('#00ff00');
      
      expect(updated.name).toBe('Test');
      expect(updated.icon).toBe('📝');
      expect(updated.color).toBe('#00ff00');
      expect(original.color).toBe('#ff6b6b'); // Original unchanged
    });

    it('validates new color', () => {
      const metadata = new ListMetadata('Test', '📝', '#ff6b6b');
      
      expect(() => {
        metadata.withColor('invalid-color');
      }).toThrow('List color must be a valid hex color (#RRGGBB) or CSS color name');
    });
  });

  describe('equals', () => {
    it('returns true for identical metadata', () => {
      const metadata1 = new ListMetadata('Test', '📝', '#ff6b6b');
      const metadata2 = new ListMetadata('Test', '📝', '#ff6b6b');
      
      expect(metadata1.equals(metadata2)).toBe(true);
    });

    it('returns false for different metadata', () => {
      const metadata1 = new ListMetadata('Test', '📝', '#ff6b6b');
      const metadata2 = new ListMetadata('Different', '📝', '#ff6b6b');
      
      expect(metadata1.equals(metadata2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns string representation', () => {
      const metadata = new ListMetadata('Test List', '📝', '#ff6b6b');
      const str = metadata.toString();
      
      expect(str).toContain('ListMetadata');
      expect(str).toContain('Test List');
      expect(str).toContain('📝');
      expect(str).toContain('#ff6b6b');
    });
  });
});

describe('ItemReference', () => {
  describe('constructor', () => {
    const testCases = [
      {
        name: 'creates reference with valid parameters',
        input: { itemId: 'item-1', itemType: 'Recipe', order: 0 },
        expected: { itemId: 'item-1', itemType: 'Recipe', order: 0 }
      },
      {
        name: 'creates reference with high order number',
        input: { itemId: 'item-999', itemType: 'Task', order: 999 },
        expected: { itemId: 'item-999', itemType: 'Task', order: 999 }
      }
    ];

    testCases.forEach(tc => {
      it(tc.name, () => {
        const reference = new ItemReference(tc.input.itemId, tc.input.itemType, tc.input.order);
        
        expect(reference.itemId).toBe(tc.expected.itemId);
        expect(reference.itemType).toBe(tc.expected.itemType);
        expect(reference.order).toBe(tc.expected.order);
      });
    });
  });

  describe('validation', () => {
    const validationTestCases = [
      {
        name: 'throws error for empty item ID',
        input: { itemId: '', itemType: 'Recipe', order: 0 },
        expectedError: 'Item ID cannot be empty'
      },
      {
        name: 'throws error for whitespace-only item ID',
        input: { itemId: '   ', itemType: 'Recipe', order: 0 },
        expectedError: 'Item ID cannot be empty'
      },
      {
        name: 'throws error for empty item type',
        input: { itemId: 'item-1', itemType: '', order: 0 },
        expectedError: 'Item type cannot be empty'
      },
      {
        name: 'throws error for whitespace-only item type',
        input: { itemId: 'item-1', itemType: '   ', order: 0 },
        expectedError: 'Item type cannot be empty'
      },
      {
        name: 'throws error for negative order',
        input: { itemId: 'item-1', itemType: 'Recipe', order: -1 },
        expectedError: 'Item order cannot be negative'
      },
      {
        name: 'throws error for non-integer order',
        input: { itemId: 'item-1', itemType: 'Recipe', order: 1.5 },
        expectedError: 'Item order must be an integer'
      }
    ];

    validationTestCases.forEach(tc => {
      it(tc.name, () => {
        expect(() => {
          new ItemReference(tc.input.itemId, tc.input.itemType, tc.input.order);
        }).toThrow(tc.expectedError);
      });
    });
  });

  describe('withOrder', () => {
    it('creates new reference with updated order', () => {
      const original = new ItemReference('item-1', 'Recipe', 0);
      const updated = original.withOrder(5);
      
      expect(updated.itemId).toBe('item-1');
      expect(updated.itemType).toBe('Recipe');
      expect(updated.order).toBe(5);
      expect(original.order).toBe(0); // Original unchanged
    });

    it('validates new order', () => {
      const reference = new ItemReference('item-1', 'Recipe', 0);
      
      expect(() => {
        reference.withOrder(-1);
      }).toThrow('Item order cannot be negative');
    });
  });

  describe('equals', () => {
    it('returns true for identical references', () => {
      const ref1 = new ItemReference('item-1', 'Recipe', 0);
      const ref2 = new ItemReference('item-1', 'Recipe', 0);
      
      expect(ref1.equals(ref2)).toBe(true);
    });

    it('returns false for different references', () => {
      const ref1 = new ItemReference('item-1', 'Recipe', 0);
      const ref2 = new ItemReference('item-2', 'Recipe', 0);
      
      expect(ref1.equals(ref2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns string representation', () => {
      const reference = new ItemReference('item-1', 'Recipe', 5);
      const str = reference.toString();
      
      expect(str).toContain('ItemReference');
      expect(str).toContain('item-1');
      expect(str).toContain('Recipe');
      expect(str).toContain('5');
    });
  });
});


