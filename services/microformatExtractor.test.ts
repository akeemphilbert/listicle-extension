import { describe, it, expect, beforeEach, vi } from 'vitest';
import { microformatExtractor, MicroformatData, ExtractedContent, HRecipe } from './microformatExtractor';

// Mock DOM environment
const mockDocument = {
  title: 'Test Page Title',
  location: { href: 'https://example.com/test-page' },
  querySelectorAll: vi.fn(),
  querySelector: vi.fn(),
  body: {
    cloneNode: vi.fn(() => ({
      textContent: 'Mock body content',
      querySelectorAll: vi.fn(() => []),
    })),
    textContent: 'Mock body content',
  },
};

const mockWindow = {
  location: mockDocument.location,
};

// Mock DOM elements
const createMockElement = (tagName: string, attributes: Record<string, string> = {}, textContent = ''): any => {
  const mockClone = {
    textContent,
    querySelectorAll: vi.fn(() => []),
  };
  
  return {
    tagName: tagName.toUpperCase(),
    textContent,
    getAttribute: vi.fn((name: string) => attributes[name] || null),
    hasAttribute: vi.fn((name: string) => name in attributes),
    cloneNode: vi.fn(() => mockClone),
    querySelectorAll: vi.fn(() => []),
    querySelector: vi.fn(() => null),
    remove: vi.fn(),
  };
};

describe('MicroformatExtractor', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock global objects
    Object.defineProperty(global, 'document', {
      value: mockDocument,
      writable: true,
    });
    
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
    });
  });

  describe('extractAll', () => {
    it('should extract all microformat data from a page', () => {
      // Mock basic page elements
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'script[type="application/ld+json"]') {
          return [
            createMockElement('script', { type: 'application/ld+json' }, JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: 'Test Article',
              author: { '@type': 'Person', name: 'John Doe' }
            }))
          ];
        }
        if (selector === '[itemscope]') {
          return [
            createMockElement('div', { itemscope: '', itemtype: 'https://schema.org/Article' })
          ];
        }
        if (selector === 'meta[property^="og:"]') {
          return [
            createMockElement('meta', { property: 'og:title', content: 'Open Graph Title' }),
            createMockElement('meta', { property: 'og:description', content: 'Open Graph Description' })
          ];
        }
        if (selector === 'meta[name^="twitter:"]') {
          return [
            createMockElement('meta', { name: 'twitter:card', content: 'summary' }),
            createMockElement('meta', { name: 'twitter:title', content: 'Twitter Title' })
          ];
        }
        if (selector === 'h1, h2, h3, h4, h5, h6') {
          return [
            createMockElement('h1', {}, 'Main Heading'),
            createMockElement('h2', {}, 'Sub Heading')
          ];
        }
        if (selector === 'ul, ol') {
          const mockList = createMockElement('ul', {});
          mockList.querySelectorAll.mockReturnValue([
            createMockElement('li', {}, 'List item 1'),
            createMockElement('li', {}, 'List item 2')
          ]);
          return [mockList];
        }
        if (selector === 'table') {
          const mockTable = createMockElement('table', {});
          const mockRow = createMockElement('tr', {});
          mockRow.querySelectorAll.mockReturnValue([
            createMockElement('td', {}, 'Cell 1'),
            createMockElement('td', {}, 'Cell 2')
          ]);
          mockTable.querySelectorAll.mockReturnValue([mockRow]);
          return [mockTable];
        }
        if (selector === 'meta[name="description"]') {
          return [createMockElement('meta', { name: 'description', content: 'Page description' })];
        }
        if (selector === 'main, article, [role="main"], .content, #content, .main-content, .post-content, .entry-content') {
          return [createMockElement('main', {}, 'Main content area')];
        }
        if (selector === '.h-recipe, [class*="h-recipe"]') {
          return [];
        }
        return [];
      });
      
      mockDocument.querySelector.mockImplementation((selector: string) => {
        if (selector === 'meta[name="description"]') {
          return createMockElement('meta', { name: 'description', content: 'Page description' });
        }
        if (selector === 'main') {
          return createMockElement('main', {}, 'Main content area');
        }
        return null;
      });

      const result = microformatExtractor.extractAll();

      expect(result).toEqual({
        title: 'Test Page Title',
        description: 'Page description',
        url: 'https://example.com/test-page',
        content: 'Main content area',
        microformats: {
          schemaOrg: expect.arrayContaining([
            expect.objectContaining({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: 'Test Article'
            })
          ]),
          microdata: expect.arrayContaining([
            expect.objectContaining({
              type: 'https://schema.org/Article',
              properties: {}
            })
          ]),
          openGraph: {
            'og:title': 'Open Graph Title',
            'og:description': 'Open Graph Description'
          },
          twitter: {
            'twitter:card': 'summary',
            'twitter:title': 'Twitter Title'
          },
          hRecipe: [],
          semantic: {
            headings: ['Main Heading', 'Sub Heading'],
            lists: ['List item 1', 'List item 2'],
            tables: ['Cell 1 | Cell 2']
          }
        }
      });
    });
  });

  describe('Schema.org JSON-LD extraction', () => {
    it('should extract single JSON-LD object', () => {
      const mockScript = createMockElement('script', { type: 'application/ld+json' }, JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Test Article'
      }));

      mockDocument.querySelectorAll.mockReturnValue([mockScript]);

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.schemaOrg).toHaveLength(1);
      expect(result.microformats.schemaOrg![0]).toEqual({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Test Article'
      });
    });

    it('should extract array of JSON-LD objects', () => {
      const mockScript = createMockElement('script', { type: 'application/ld+json' }, JSON.stringify([
        { '@type': 'Article', headline: 'Article 1' },
        { '@type': 'Person', name: 'John Doe' }
      ]));

      mockDocument.querySelectorAll.mockReturnValue([mockScript]);

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.schemaOrg).toHaveLength(2);
      expect(result.microformats.schemaOrg![0]).toEqual({ '@type': 'Article', headline: 'Article 1' });
      expect(result.microformats.schemaOrg![1]).toEqual({ '@type': 'Person', name: 'John Doe' });
    });

    it('should handle malformed JSON gracefully', () => {
      const mockScript = createMockElement('script', { type: 'application/ld+json' }, 'invalid json {');
      mockDocument.querySelectorAll.mockReturnValue([mockScript]);

      // Mock console.warn to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.schemaOrg).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse JSON-LD:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Microdata extraction', () => {
    it('should extract microdata with properties', () => {
      const mockItem = createMockElement('div', { 
        itemscope: '', 
        itemtype: 'https://schema.org/Article' 
      });
      
      const mockProp1 = createMockElement('span', { itemprop: 'name' }, 'Article Title');
      const mockProp2 = createMockElement('span', { itemprop: 'author' }, 'John Doe');
      
      mockItem.querySelectorAll.mockReturnValue([mockProp1, mockProp2]);
      
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '[itemscope]') return [mockItem];
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.microdata).toHaveLength(1);
      expect(result.microformats.microdata![0]).toEqual({
        type: 'https://schema.org/Article',
        properties: {
          name: 'Article Title',
          author: 'John Doe'
        }
      });
    });

    it('should handle multiple values for same property', () => {
      const mockItem = createMockElement('div', { 
        itemscope: '', 
        itemtype: 'https://schema.org/Article' 
      });
      
      const mockProp1 = createMockElement('span', { itemprop: 'author' }, 'John Doe');
      const mockProp2 = createMockElement('span', { itemprop: 'author' }, 'Jane Smith');
      
      mockItem.querySelectorAll.mockReturnValue([mockProp1, mockProp2]);
      
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '[itemscope]') return [mockItem];
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.microdata![0].properties.author).toEqual(['John Doe', 'Jane Smith']);
    });

    it('should extract different microdata value types', () => {
      const mockItem = createMockElement('div', { 
        itemscope: '', 
        itemtype: 'https://schema.org/Article' 
      });
      
      const mockMeta = createMockElement('meta', { itemprop: 'description', content: 'Meta content' });
      const mockImg = createMockElement('img', { itemprop: 'image', src: 'image.jpg' });
      const mockLink = createMockElement('a', { itemprop: 'url', href: 'https://example.com' });
      const mockTime = createMockElement('time', { itemprop: 'datePublished', datetime: '2023-01-01' });
      
      mockItem.querySelectorAll.mockReturnValue([mockMeta, mockImg, mockLink, mockTime]);
      
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '[itemscope]') return [mockItem];
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      const properties = result.microformats.microdata![0].properties;
      expect(properties.description).toBe('Meta content');
      expect(properties.image).toBe('image.jpg');
      expect(properties.url).toBe('https://example.com');
      expect(properties.datePublished).toBe('2023-01-01');
    });
  });

  describe('Open Graph extraction', () => {
    it('should extract Open Graph meta tags', () => {
      const mockMetas = [
        createMockElement('meta', { property: 'og:title', content: 'OG Title' }),
        createMockElement('meta', { property: 'og:description', content: 'OG Description' }),
        createMockElement('meta', { property: 'og:image', content: 'og-image.jpg' }),
        createMockElement('meta', { property: 'og:url', content: 'https://example.com' })
      ];

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'meta[property^="og:"]') return mockMetas;
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.openGraph).toEqual({
        'og:title': 'OG Title',
        'og:description': 'OG Description',
        'og:image': 'og-image.jpg',
        'og:url': 'https://example.com'
      });
    });

    it('should ignore meta tags without content', () => {
      const mockMetas = [
        createMockElement('meta', { property: 'og:title', content: 'OG Title' }),
        createMockElement('meta', { property: 'og:description' }) // No content
      ];

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'meta[property^="og:"]') return mockMetas;
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.openGraph).toEqual({
        'og:title': 'OG Title'
      });
    });
  });

  describe('Twitter Cards extraction', () => {
    it('should extract Twitter Card meta tags', () => {
      const mockMetas = [
        createMockElement('meta', { name: 'twitter:card', content: 'summary_large_image' }),
        createMockElement('meta', { name: 'twitter:title', content: 'Twitter Title' }),
        createMockElement('meta', { name: 'twitter:description', content: 'Twitter Description' }),
        createMockElement('meta', { name: 'twitter:image', content: 'twitter-image.jpg' })
      ];

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'meta[name^="twitter:"]') return mockMetas;
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.twitter).toEqual({
        'twitter:card': 'summary_large_image',
        'twitter:title': 'Twitter Title',
        'twitter:description': 'Twitter Description',
        'twitter:image': 'twitter-image.jpg'
      });
    });
  });

  describe('h-recipe extraction', () => {
    it('should extract basic h-recipe data', () => {
      const mockRecipe = createMockElement('div', { class: 'h-recipe' });
      
      const mockName = createMockElement('h1', { class: 'p-name' }, 'Chocolate Chip Cookies');
      const mockIngredient1 = createMockElement('li', { class: 'p-ingredient' }, '2 cups flour');
      const mockIngredient2 = createMockElement('li', { class: 'p-ingredient' }, '1 cup sugar');
      const mockInstruction = createMockElement('li', { class: 'e-instructions' }, 'Mix ingredients together');
      
      mockRecipe.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return [mockName];
        if (selector === '.p-ingredient, [class*="p-ingredient"]') return [mockIngredient1, mockIngredient2];
        if (selector === '.e-instructions, [class*="e-instructions"]') return [mockInstruction];
        return [];
      });
      
      mockRecipe.querySelector.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return mockName;
        return null;
      });

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.h-recipe, [class*="h-recipe"]') return [mockRecipe];
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.hRecipe).toHaveLength(1);
      expect(result.microformats.hRecipe![0]).toEqual({
        name: 'Chocolate Chip Cookies',
        ingredients: ['2 cups flour', '1 cup sugar'],
        instructions: ['Mix ingredients together']
      });
    });

    it('should extract complete h-recipe with all properties', () => {
      const mockRecipe = createMockElement('div', { class: 'h-recipe' });
      
      // Create all the mock elements
      const mockName = createMockElement('h1', { class: 'p-name' }, 'Perfect Pancakes');
      const mockIngredient = createMockElement('li', { class: 'p-ingredient' }, '1 cup flour');
      const mockInstruction = createMockElement('li', { class: 'e-instructions' }, 'Heat pan to medium');
      const mockPrepTime = createMockElement('span', { class: 'p-prep-time' }, '10 minutes');
      const mockCookTime = createMockElement('span', { class: 'p-cook-time' }, '15 minutes');
      const mockTotalTime = createMockElement('span', { class: 'p-total-time' }, '25 minutes');
      const mockYield = createMockElement('span', { class: 'p-yield' }, '4 servings');
      const mockAuthor = createMockElement('span', { class: 'p-author' }, 'Chef John');
      const mockPublished = createMockElement('time', { class: 'dt-published', datetime: '2023-01-01' }, 'January 1, 2023');
      const mockImage = createMockElement('img', { class: 'u-photo', src: 'pancakes.jpg' }, '');
      const mockUrl = createMockElement('a', { class: 'u-url', href: 'https://example.com/pancakes' }, '');
      const mockDescription = createMockElement('p', { class: 'p-summary' }, 'Fluffy pancakes recipe');
      const mockCuisine = createMockElement('span', { class: 'p-cuisine' }, 'American');
      const mockCategory = createMockElement('span', { class: 'p-category' }, 'Breakfast');
      const mockDifficulty = createMockElement('span', { class: 'p-difficulty' }, 'Easy');
      const mockRating = createMockElement('span', { class: 'p-rating' }, '4.5 stars');
      
      // Mock nutrition element
      const mockNutrition = createMockElement('div', { class: 'h-nutrition' });
      const mockCalories = createMockElement('span', { class: 'p-calories' }, '250 calories');
      const mockFat = createMockElement('span', { class: 'p-fat' }, '8g fat');
      const mockProtein = createMockElement('span', { class: 'p-protein' }, '6g protein');
      const mockCarbs = createMockElement('span', { class: 'p-carbs' }, '35g carbs');
      
      mockNutrition.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.p-calories, [class*="p-calories"]') return [mockCalories];
        if (selector === '.p-fat, [class*="p-fat"]') return [mockFat];
        if (selector === '.p-protein, [class*="p-protein"]') return [mockProtein];
        if (selector === '.p-carbs, [class*="p-carbs"]') return [mockCarbs];
        return [];
      });
      
      mockNutrition.querySelector.mockImplementation((selector: string) => {
        if (selector === '.p-calories, [class*="p-calories"]') return mockCalories;
        if (selector === '.p-fat, [class*="p-fat"]') return mockFat;
        if (selector === '.p-protein, [class*="p-protein"]') return mockProtein;
        if (selector === '.p-carbs, [class*="p-carbs"]') return mockCarbs;
        return null;
      });
      
      mockRecipe.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return [mockName];
        if (selector === '.p-ingredient, [class*="p-ingredient"]') return [mockIngredient];
        if (selector === '.e-instructions, [class*="e-instructions"]') return [mockInstruction];
        if (selector === '.p-prep-time, [class*="p-prep-time"]') return [mockPrepTime];
        if (selector === '.p-cook-time, [class*="p-cook-time"]') return [mockCookTime];
        if (selector === '.p-total-time, [class*="p-total-time"]') return [mockTotalTime];
        if (selector === '.p-yield, [class*="p-yield"]') return [mockYield];
        if (selector === '.h-nutrition, [class*="h-nutrition"]') return [mockNutrition];
        if (selector === '.p-author, [class*="p-author"]') return [mockAuthor];
        if (selector === '.dt-published, [class*="dt-published"]') return [mockPublished];
        if (selector === '.u-photo, [class*="u-photo"]') return [mockImage];
        if (selector === '.u-url, [class*="u-url"]') return [mockUrl];
        if (selector === '.p-summary, [class*="p-summary"]') return [mockDescription];
        if (selector === '.p-cuisine, [class*="p-cuisine"]') return [mockCuisine];
        if (selector === '.p-category, [class*="p-category"]') return [mockCategory];
        if (selector === '.p-difficulty, [class*="p-difficulty"]') return [mockDifficulty];
        if (selector === '.p-rating, [class*="p-rating"]') return [mockRating];
        return [];
      });
      
      mockRecipe.querySelector.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return mockName;
        if (selector === '.p-prep-time, [class*="p-prep-time"]') return mockPrepTime;
        if (selector === '.p-cook-time, [class*="p-cook-time"]') return mockCookTime;
        if (selector === '.p-total-time, [class*="p-total-time"]') return mockTotalTime;
        if (selector === '.p-yield, [class*="p-yield"]') return mockYield;
        if (selector === '.h-nutrition, [class*="h-nutrition"]') return mockNutrition;
        if (selector === '.p-author, [class*="p-author"]') return mockAuthor;
        if (selector === '.dt-published, [class*="dt-published"]') return mockPublished;
        if (selector === '.u-photo, [class*="u-photo"]') return mockImage;
        if (selector === '.u-url, [class*="u-url"]') return mockUrl;
        if (selector === '.p-summary, [class*="p-summary"]') return mockDescription;
        if (selector === '.p-cuisine, [class*="p-cuisine"]') return mockCuisine;
        if (selector === '.p-category, [class*="p-category"]') return mockCategory;
        if (selector === '.p-difficulty, [class*="p-difficulty"]') return mockDifficulty;
        if (selector === '.p-rating, [class*="p-rating"]') return mockRating;
        return null;
      });

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.h-recipe, [class*="h-recipe"]') return [mockRecipe];
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.hRecipe).toHaveLength(1);
      expect(result.microformats.hRecipe![0]).toEqual({
        name: 'Perfect Pancakes',
        ingredients: ['1 cup flour'],
        instructions: ['Heat pan to medium'],
        prepTime: '10 minutes',
        cookTime: '15 minutes',
        totalTime: '25 minutes',
        yield: '4 servings',
        nutrition: {
          calories: '250 calories',
          fat: '8g fat',
          protein: '6g protein',
          carbs: '35g carbs'
        },
        author: 'Chef John',
        published: '2023-01-01',
        image: 'pancakes.jpg',
        url: 'https://example.com/pancakes',
        description: 'Fluffy pancakes recipe',
        cuisine: 'American',
        category: 'Breakfast',
        difficulty: 'Easy',
        rating: '4.5 stars'
      });
    });

    it('should extract multiple h-recipe elements', () => {
      const mockRecipe1 = createMockElement('div', { class: 'h-recipe' });
      const mockRecipe2 = createMockElement('div', { class: 'h-recipe' });
      
      const mockName1 = createMockElement('h1', { class: 'p-name' }, 'Recipe 1');
      const mockName2 = createMockElement('h1', { class: 'p-name' }, 'Recipe 2');
      
      mockRecipe1.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return [mockName1];
        return [];
      });
      
      mockRecipe1.querySelector.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return mockName1;
        return null;
      });
      
      mockRecipe2.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return [mockName2];
        return [];
      });
      
      mockRecipe2.querySelector.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return mockName2;
        return null;
      });

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.h-recipe, [class*="h-recipe"]') return [mockRecipe1, mockRecipe2];
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.hRecipe).toHaveLength(2);
      expect(result.microformats.hRecipe![0].name).toBe('Recipe 1');
      expect(result.microformats.hRecipe![1].name).toBe('Recipe 2');
    });

    it('should handle h-recipe with partial data', () => {
      const mockRecipe = createMockElement('div', { class: 'h-recipe' });
      
      const mockIngredient = createMockElement('li', { class: 'p-ingredient' }, '1 cup flour');
      
      mockRecipe.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return [];
        if (selector === '.p-ingredient, [class*="p-ingredient"]') return [mockIngredient];
        return [];
      });
      
      mockRecipe.querySelector.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return null;
        return null;
      });

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.h-recipe, [class*="h-recipe"]') return [mockRecipe];
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.hRecipe).toHaveLength(1);
      expect(result.microformats.hRecipe![0]).toEqual({
        ingredients: ['1 cup flour']
      });
    });

    it('should not include h-recipe without name or ingredients', () => {
      const mockRecipe = createMockElement('div', { class: 'h-recipe' });
      
      const mockAuthor = createMockElement('span', { class: 'p-author' }, 'Chef John');
      
      mockRecipe.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return [];
        if (selector === '.p-ingredient, [class*="p-ingredient"]') return [];
        if (selector === '.p-author, [class*="p-author"]') return [mockAuthor];
        return [];
      });
      
      mockRecipe.querySelector.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return null;
        if (selector === '.p-author, [class*="p-author"]') return mockAuthor;
        return null;
      });

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.h-recipe, [class*="h-recipe"]') return [mockRecipe];
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.hRecipe).toHaveLength(0);
    });

    it('should handle empty nutrition data', () => {
      const mockRecipe = createMockElement('div', { class: 'h-recipe' });
      
      const mockName = createMockElement('h1', { class: 'p-name' }, 'Test Recipe');
      const mockNutrition = createMockElement('div', { class: 'h-nutrition' });
      
      mockNutrition.querySelectorAll.mockReturnValue([]);
      mockNutrition.querySelector.mockReturnValue(null);
      
      mockRecipe.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return [mockName];
        if (selector === '.h-nutrition, [class*="h-nutrition"]') return [mockNutrition];
        return [];
      });
      
      mockRecipe.querySelector.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return mockName;
        if (selector === '.h-nutrition, [class*="h-nutrition"]') return mockNutrition;
        return null;
      });

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.h-recipe, [class*="h-recipe"]') return [mockRecipe];
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.hRecipe).toHaveLength(1);
      expect(result.microformats.hRecipe![0].nutrition).toBeUndefined();
    });

    it('should handle different element types for URLs and images', () => {
      const mockRecipe = createMockElement('div', { class: 'h-recipe' });
      
      const mockName = createMockElement('h1', { class: 'p-name' }, 'Test Recipe');
      const mockImageText = createMockElement('span', { class: 'u-photo' }, 'image-url.jpg');
      const mockUrlText = createMockElement('span', { class: 'u-url' }, 'https://example.com');
      
      mockRecipe.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return [mockName];
        if (selector === '.u-photo, [class*="u-photo"]') return [mockImageText];
        if (selector === '.u-url, [class*="u-url"]') return [mockUrlText];
        return [];
      });
      
      mockRecipe.querySelector.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return mockName;
        if (selector === '.u-photo, [class*="u-photo"]') return mockImageText;
        if (selector === '.u-url, [class*="u-url"]') return mockUrlText;
        return null;
      });

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.h-recipe, [class*="h-recipe"]') return [mockRecipe];
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.hRecipe![0].image).toBe('image-url.jpg');
      expect(result.microformats.hRecipe![0].url).toBe('https://example.com');
    });
  });

  describe('Semantic HTML extraction', () => {
    it('should extract headings', () => {
      const mockHeadings = [
        createMockElement('h1', {}, 'Main Title'),
        createMockElement('h2', {}, 'Section Title'),
        createMockElement('h3', {}, 'Subsection Title')
      ];

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'h1, h2, h3, h4, h5, h6') return mockHeadings;
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.semantic?.headings).toEqual([
        'Main Title',
        'Section Title',
        'Subsection Title'
      ]);
    });

    it('should extract list items', () => {
      const mockList = createMockElement('ul', {});
      const mockItems = [
        createMockElement('li', {}, 'First item'),
        createMockElement('li', {}, 'Second item'),
        createMockElement('li', {}, 'Third item')
      ];
      mockList.querySelectorAll.mockReturnValue(mockItems);

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'ul, ol') return [mockList];
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.semantic?.lists).toEqual([
        'First item',
        'Second item',
        'Third item'
      ]);
    });

    it('should extract table data', () => {
      const mockTable = createMockElement('table', {});
      const mockRow = createMockElement('tr', {});
      const mockCells = [
        createMockElement('td', {}, 'Header 1'),
        createMockElement('td', {}, 'Header 2'),
        createMockElement('td', {}, 'Data 1'),
        createMockElement('td', {}, 'Data 2')
      ];
      mockRow.querySelectorAll.mockReturnValue(mockCells);
      mockTable.querySelectorAll.mockReturnValue([mockRow]);

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'table') return [mockTable];
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.semantic?.tables).toEqual([
        'Header 1 | Header 2 | Data 1 | Data 2'
      ]);
    });
  });

  describe('Content extraction', () => {
    it('should extract title from document', () => {
      mockDocument.title = 'Test Page Title';
      
      const result = microformatExtractor.extractAll();
      
      expect(result.title).toBe('Test Page Title');
    });

    it('should extract description from meta tag', () => {
      const mockMeta = createMockElement('meta', { name: 'description', content: 'Page description' });
      
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'meta[name="description"]') return [mockMeta];
        return [];
      });
      
      mockDocument.querySelector.mockImplementation((selector: string) => {
        if (selector === 'meta[name="description"]') return mockMeta;
        return null;
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.description).toBe('Page description');
    });

    it('should fallback to Open Graph description', () => {
      const mockOgMeta = createMockElement('meta', { property: 'og:description', content: 'OG description' });
      
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'meta[name="description"]') return [];
        if (selector === 'meta[property="og:description"]') return [mockOgMeta];
        return [];
      });
      
      mockDocument.querySelector.mockImplementation((selector: string) => {
        if (selector === 'meta[name="description"]') return null;
        if (selector === 'meta[property="og:description"]') return mockOgMeta;
        return null;
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.description).toBe('OG description');
    });

    it('should fallback to Twitter description', () => {
      const mockTwitterMeta = createMockElement('meta', { name: 'twitter:description', content: 'Twitter description' });
      
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'meta[name="description"]') return [];
        if (selector === 'meta[property="og:description"]') return [];
        if (selector === 'meta[name="twitter:description"]') return [mockTwitterMeta];
        return [];
      });
      
      mockDocument.querySelector.mockImplementation((selector: string) => {
        if (selector === 'meta[name="description"]') return null;
        if (selector === 'meta[property="og:description"]') return null;
        if (selector === 'meta[name="twitter:description"]') return mockTwitterMeta;
        return null;
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.description).toBe('Twitter description');
    });

    it('should extract main content from main element', () => {
      const mockMain = createMockElement('main', {}, 'Main content here');
      
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'main, article, [role="main"], .content, #content, .main-content, .post-content, .entry-content') {
          return [mockMain];
        }
        return [];
      });
      
      mockDocument.querySelector.mockImplementation((selector: string) => {
        if (selector === 'main') return mockMain;
        return null;
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.content).toBe('Main content here');
    });

    it('should fallback to body content when no main element found', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);
      mockDocument.querySelector.mockReturnValue(null);
      mockDocument.body.textContent = 'Body content fallback';
      mockDocument.body.cloneNode.mockReturnValue({
        textContent: 'Body content fallback',
        querySelectorAll: vi.fn(() => []),
      });
      
      const result = microformatExtractor.extractAll();
      
      expect(result.content).toBe('Body content fallback');
    });
  });

  describe('hasMicroformat', () => {
    it('should detect Schema.org presence', () => {
      const mockScript = createMockElement('script', { type: 'application/ld+json' }, JSON.stringify({
        '@type': 'Article'
      }));

      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'script[type="application/ld+json"]') return [mockScript];
        return [];
      });

      expect(microformatExtractor.hasMicroformat('schema')).toBe(true);
    });

    it('should detect Microdata presence', () => {
      const mockItem = createMockElement('div', { itemscope: '', itemtype: 'https://schema.org/Article' });
      
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '[itemscope]') return [mockItem];
        return [];
      });

      expect(microformatExtractor.hasMicroformat('microdata')).toBe(true);
    });

    it('should detect Open Graph presence', () => {
      const mockMeta = createMockElement('meta', { property: 'og:title', content: 'OG Title' });
      
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'meta[property^="og:"]') return [mockMeta];
        return [];
      });

      expect(microformatExtractor.hasMicroformat('opengraph')).toBe(true);
    });

    it('should detect Twitter Cards presence', () => {
      const mockMeta = createMockElement('meta', { name: 'twitter:card', content: 'summary' });
      
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'meta[name^="twitter:"]') return [mockMeta];
        return [];
      });

      expect(microformatExtractor.hasMicroformat('twitter')).toBe(true);
    });

    it('should detect h-recipe presence', () => {
      const mockRecipe = createMockElement('div', { class: 'h-recipe' });
      const mockName = createMockElement('h1', { class: 'p-name' }, 'Test Recipe');
      
      mockRecipe.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return [mockName];
        return [];
      });
      
      mockRecipe.querySelector.mockImplementation((selector: string) => {
        if (selector === '.p-name, [class*="p-name"]') return mockName;
        return null;
      });
      
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === '.h-recipe, [class*="h-recipe"]') return [mockRecipe];
        return [];
      });

      expect(microformatExtractor.hasMicroformat('h-recipe')).toBe(true);
    });

    it('should return false for unknown microformat type', () => {
      expect(microformatExtractor.hasMicroformat('unknown' as any)).toBe(false);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty page gracefully', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);
      mockDocument.querySelector.mockReturnValue(null);
      mockDocument.title = '';
      mockDocument.body.textContent = '';
      mockDocument.body.cloneNode.mockReturnValue({
        textContent: '',
        querySelectorAll: vi.fn(() => []),
      });

      const result = microformatExtractor.extractAll();
      
      expect(result).toEqual({
        title: '',
        description: '',
        url: 'https://example.com/test-page',
        content: '',
        microformats: {
          schemaOrg: [],
          microdata: [],
          openGraph: {},
          twitter: {},
          hRecipe: [],
          semantic: {
            headings: [],
            lists: [],
            tables: []
          }
        }
      });
    });

    it('should handle missing attributes gracefully', () => {
      const mockElement = createMockElement('meta', {});
      mockElement.getAttribute.mockReturnValue(null);
      
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'meta[property^="og:"]') return [mockElement];
        return [];
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.microformats.openGraph).toEqual({});
    });

    it('should limit content length to 5000 characters', () => {
      const longContent = 'a'.repeat(6000);
      const mockMain = createMockElement('main', {}, longContent);
      
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector === 'main, article, [role="main"], .content, #content, .main-content, .post-content, .entry-content') {
          return [mockMain];
        }
        return [];
      });
      
      mockDocument.querySelector.mockImplementation((selector: string) => {
        if (selector === 'main') return mockMain;
        return null;
      });

      const result = microformatExtractor.extractAll();
      
      expect(result.content).toHaveLength(5003); // 5000 + '...'
      expect(result.content.endsWith('...')).toBe(true);
    });
  });
});
