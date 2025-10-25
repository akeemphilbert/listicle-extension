/**
 * Microformat Extraction Service
 * Extracts structured data from web pages using various microformat standards
 */

export interface MicroformatData {
  schemaOrg?: any[];
  microdata?: any[];
  openGraph?: Record<string, string>;
  twitter?: Record<string, string>;
  semantic?: {
    headings: string[];
    lists: string[];
    tables: string[];
  };
}

export interface ExtractedContent {
  title: string;
  description: string;
  url: string;
  content: string;
  microformats: MicroformatData;
}

class MicroformatExtractor {
  /**
   * Extract all available microformat data from the current page
   */
  extractAll(): ExtractedContent {
    return {
      title: this.extractTitle(),
      description: this.extractDescription(),
      url: window.location.href,
      content: this.extractMainContent(),
      microformats: {
        schemaOrg: this.extractSchemaOrg(),
        microdata: this.extractMicrodata(),
        openGraph: this.extractOpenGraph(),
        twitter: this.extractTwitterCards(),
        semantic: this.extractSemanticHTML(),
      },
    };
  }

  /**
   * Extract Schema.org JSON-LD structured data
   */
  private extractSchemaOrg(): any[] {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const schemas: any[] = [];

    scripts.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || '');
        if (Array.isArray(data)) {
          schemas.push(...data);
        } else {
          schemas.push(data);
        }
      } catch (error) {
        console.warn('Failed to parse JSON-LD:', error);
      }
    });

    return schemas;
  }

  /**
   * Extract Microdata attributes
   */
  private extractMicrodata(): any[] {
    const items: any[] = [];
    const microdataElements = document.querySelectorAll('[itemscope]');

    microdataElements.forEach((element) => {
      const item: any = {
        type: element.getAttribute('itemtype'),
        properties: {},
      };

      // Extract properties
      const properties = element.querySelectorAll('[itemprop]');
      properties.forEach((prop) => {
        const propName = prop.getAttribute('itemprop');
        if (propName) {
          const value = this.getMicrodataValue(prop);
          if (item.properties[propName]) {
            // Handle multiple values
            if (Array.isArray(item.properties[propName])) {
              item.properties[propName].push(value);
            } else {
              item.properties[propName] = [item.properties[propName], value];
            }
          } else {
            item.properties[propName] = value;
          }
        }
      });

      items.push(item);
    });

    return items;
  }

  /**
   * Get value from microdata element
   */
  private getMicrodataValue(element: Element): string {
    if (element.hasAttribute('itemscope')) {
      // Nested item
      return element.getAttribute('itemtype') || '';
    }

    const tagName = element.tagName.toLowerCase();
    if (tagName === 'meta') {
      return element.getAttribute('content') || '';
    } else if (tagName === 'img') {
      return element.getAttribute('src') || '';
    } else if (tagName === 'a') {
      return element.getAttribute('href') || '';
    } else if (tagName === 'time') {
      return element.getAttribute('datetime') || element.textContent || '';
    } else {
      return element.textContent || '';
    }
  }

  /**
   * Extract Open Graph meta tags
   */
  private extractOpenGraph(): Record<string, string> {
    const og: Record<string, string> = {};
    const metaTags = document.querySelectorAll('meta[property^="og:"]');

    metaTags.forEach((meta) => {
      const property = meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (property && content) {
        og[property] = content;
      }
    });

    return og;
  }

  /**
   * Extract Twitter Card meta tags
   */
  private extractTwitterCards(): Record<string, string> {
    const twitter: Record<string, string> = {};
    const metaTags = document.querySelectorAll('meta[name^="twitter:"]');

    metaTags.forEach((meta) => {
      const name = meta.getAttribute('name');
      const content = meta.getAttribute('content');
      if (name && content) {
        twitter[name] = content;
      }
    });

    return twitter;
  }

  /**
   * Extract semantic HTML elements
   */
  private extractSemanticHTML(): {
    headings: string[];
    lists: string[];
    tables: string[];
  } {
    return {
      headings: this.extractHeadings(),
      lists: this.extractLists(),
      tables: this.extractTables(),
    };
  }

  /**
   * Extract heading text
   */
  private extractHeadings(): string[] {
    const headings: string[] = [];
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headingElements.forEach((heading) => {
      const text = heading.textContent?.trim();
      if (text) {
        headings.push(text);
      }
    });

    return headings;
  }

  /**
   * Extract list items
   */
  private extractLists(): string[] {
    const lists: string[] = [];
    const listElements = document.querySelectorAll('ul, ol');

    listElements.forEach((list) => {
      const items = list.querySelectorAll('li');
      items.forEach((item) => {
        const text = item.textContent?.trim();
        if (text) {
          lists.push(text);
        }
      });
    });

    return lists;
  }

  /**
   * Extract table data
   */
  private extractTables(): string[] {
    const tables: string[] = [];
    const tableElements = document.querySelectorAll('table');

    tableElements.forEach((table) => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td, th');
        const rowData: string[] = [];
        cells.forEach((cell) => {
          const text = cell.textContent?.trim();
          if (text) {
            rowData.push(text);
          }
        });
        if (rowData.length > 0) {
          tables.push(rowData.join(' | '));
        }
      });
    });

    return tables;
  }

  /**
   * Extract page title
   */
  private extractTitle(): string {
    return document.title || '';
  }

  /**
   * Extract page description
   */
  private extractDescription(): string {
    // Try meta description first
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      return metaDesc.getAttribute('content') || '';
    }

    // Try Open Graph description
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      return ogDesc.getAttribute('content') || '';
    }

    // Try Twitter description
    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) {
      return twitterDesc.getAttribute('content') || '';
    }

    return '';
  }

  /**
   * Extract main content from the page
   */
  private extractMainContent(): string {
    // Try to find main content areas
    const mainSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '#content',
      '.main-content',
      '.post-content',
      '.entry-content',
    ];

    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return this.extractTextContent(element);
      }
    }

    // Fallback to body content
    return this.extractTextContent(document.body);
  }

  /**
   * Extract text content from an element, limiting size
   */
  private extractTextContent(element: Element): string {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true) as Element;

    // Remove script and style elements
    const scripts = clone.querySelectorAll('script, style, noscript');
    scripts.forEach((script) => script.remove());

    // Get text content
    let text = clone.textContent || '';

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Limit to 5000 characters for API efficiency
    if (text.length > 5000) {
      text = text.substring(0, 5000) + '...';
    }

    return text;
  }

  /**
   * Check if page contains specific microformat types
   */
  hasMicroformat(type: 'schema' | 'microdata' | 'opengraph' | 'twitter'): boolean {
    const data = this.extractAll().microformats;

    switch (type) {
      case 'schema':
        return (data.schemaOrg?.length || 0) > 0;
      case 'microdata':
        return (data.microdata?.length || 0) > 0;
      case 'opengraph':
        return Object.keys(data.openGraph || {}).length > 0;
      case 'twitter':
        return Object.keys(data.twitter || {}).length > 0;
      default:
        return false;
    }
  }
}

export const microformatExtractor = new MicroformatExtractor();

