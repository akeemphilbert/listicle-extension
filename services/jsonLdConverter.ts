/**
 * JSON-LD Converter Service
 * Converts various microformat formats to standardized JSON-LD
 */

export interface JsonLdItem {
  '@context': string;
  '@type': string;
  '@id'?: string;
  name: string;
  url: string;
  image?: string | { url: string } | Array<string | { url: string }>;
  description?: string;
  [key: string]: any;
}

export class JsonLdConverter {
  private readonly defaultContext = 'https://schema.org';

  /**
   * Convert Schema.org JSON-LD data (already in JSON-LD format)
   * @param schemaOrgData The Schema.org JSON-LD data
   * @returns Validated and normalized JSON-LD
   */
  fromSchemaOrg(schemaOrgData: any): JsonLdItem {
    // Schema.org data is already JSON-LD, just validate and normalize
    const jsonLd: JsonLdItem = {
      '@context': schemaOrgData['@context'] || this.defaultContext,
      '@type': schemaOrgData['@type'] || 'Thing',
      '@id': schemaOrgData['@id'],
      name: schemaOrgData.name || schemaOrgData.title || schemaOrgData.headline || 'Untitled',
      url: schemaOrgData.url || schemaOrgData['@id'] || window.location.href,
    };

    // Add optional fields
    if (schemaOrgData.image) {
      jsonLd.image = schemaOrgData.image;
    }
    if (schemaOrgData.description) {
      jsonLd.description = schemaOrgData.description;
    }

    // Copy other relevant fields
    Object.keys(schemaOrgData).forEach(key => {
      if (!['@context', '@type', '@id', 'name', 'title', 'headline', 'url', 'image', 'description'].includes(key)) {
        jsonLd[key] = schemaOrgData[key];
      }
    });

    return this.ensureContext(jsonLd);
  }

  /**
   * Convert Microdata to JSON-LD format
   * @param microdataData The microdata object
   * @returns JSON-LD representation
   */
  fromMicrodata(microdataData: any): JsonLdItem {
    const jsonLd: JsonLdItem = {
      '@context': this.defaultContext,
      '@type': this.mapMicrodataType(microdataData.type),
      name: this.extractMicrodataProperty(microdataData.properties, 'name') || 'Untitled',
      url: this.extractMicrodataProperty(microdataData.properties, 'url') || window.location.href,
    };

    // Add optional fields
    const image = this.extractMicrodataProperty(microdataData.properties, 'image');
    if (image) {
      jsonLd.image = image;
    }

    const description = this.extractMicrodataProperty(microdataData.properties, 'description');
    if (description) {
      jsonLd.description = description;
    }

    // Convert other properties
    if (microdataData.properties) {
      Object.keys(microdataData.properties).forEach(key => {
        if (!['name', 'url', 'image', 'description'].includes(key)) {
          jsonLd[key] = microdataData.properties[key];
        }
      });
    }

    return this.ensureContext(jsonLd);
  }

  /**
   * Convert Open Graph data to JSON-LD format
   * @param ogData The Open Graph data
   * @param url The current page URL
   * @returns JSON-LD representation
   */
  fromOpenGraph(ogData: Record<string, string>, url: string): JsonLdItem {
    const jsonLd: JsonLdItem = {
      '@context': this.defaultContext,
      '@type': this.mapOpenGraphType(ogData['og:type']),
      '@id': url,
      name: ogData['og:title'] || 'Untitled',
      url: ogData['og:url'] || url,
    };

    // Add image
    if (ogData['og:image']) {
      jsonLd.image = ogData['og:image'];
    }

    // Add description
    if (ogData['og:description']) {
      jsonLd.description = ogData['og:description'];
    }

    // Add site name
    if (ogData['og:site_name']) {
      jsonLd.publisher = {
        '@type': 'Organization',
        name: ogData['og:site_name'],
      };
    }

    return this.ensureContext(jsonLd);
  }

  /**
   * Convert Twitter Card data to JSON-LD format
   * @param twitterData The Twitter Card data
   * @param url The current page URL
   * @returns JSON-LD representation
   */
  fromTwitterCard(twitterData: Record<string, string>, url: string): JsonLdItem {
    const jsonLd: JsonLdItem = {
      '@context': this.defaultContext,
      '@type': 'WebPage',
      '@id': url,
      name: twitterData['twitter:title'] || 'Untitled',
      url: twitterData['twitter:url'] || url,
    };

    // Add image
    if (twitterData['twitter:image']) {
      jsonLd.image = twitterData['twitter:image'];
    }

    // Add description
    if (twitterData['twitter:description']) {
      jsonLd.description = twitterData['twitter:description'];
    }

    // Add creator
    if (twitterData['twitter:creator']) {
      jsonLd.author = {
        '@type': 'Person',
        name: twitterData['twitter:creator'],
      };
    }

    return this.ensureContext(jsonLd);
  }

  /**
   * Generate a URN from URL if no @id is present
   * @param url The URL to convert
   * @returns URN string
   */
  generateId(url: string): string {
    try {
      const urlObj = new URL(url);
      return `urn:url:${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return `urn:url:${url}`;
    }
  }

  /**
   * Ensure @context is present in JSON-LD
   * @param jsonLd The JSON-LD object
   * @returns JSON-LD with ensured context
   */
  ensureContext(jsonLd: any): JsonLdItem {
    if (!jsonLd['@context']) {
      jsonLd['@context'] = this.defaultContext;
    }
    return jsonLd;
  }

  /**
   * Extract a property value from microdata properties
   * @param properties The microdata properties object
   * @param propertyName The property name to extract
   * @returns The property value or null
   */
  private extractMicrodataProperty(properties: any, propertyName: string): string | null {
    if (!properties || !properties[propertyName]) {
      return null;
    }

    const value = properties[propertyName];
    if (Array.isArray(value)) {
      return value[0] || null;
    }

    return value || null;
  }

  /**
   * Map microdata itemtype to Schema.org type
   * @param itemtype The microdata itemtype
   * @returns Schema.org type
   */
  private mapMicrodataType(itemtype: string): string {
    if (!itemtype) return 'Thing';

    // Extract the last part of the URL (e.g., "Recipe" from "http://schema.org/Recipe")
    const parts = itemtype.split('/');
    return parts[parts.length - 1] || 'Thing';
  }

  /**
   * Map Open Graph type to Schema.org type
   * @param ogType The Open Graph type
   * @returns Schema.org type
   */
  private mapOpenGraphType(ogType: string): string {
    const typeMap: Record<string, string> = {
      'article': 'Article',
      'website': 'WebSite',
      'book': 'Book',
      'profile': 'Person',
      'video.movie': 'Movie',
      'video.episode': 'TVEpisode',
      'video.tv_show': 'TVSeries',
      'video.other': 'VideoObject',
      'music.song': 'MusicRecording',
      'music.album': 'MusicAlbum',
      'music.playlist': 'MusicPlaylist',
      'music.radio_station': 'RadioStation',
    };

    return typeMap[ogType || ''] || 'WebPage';
  }

  /**
   * Convert semantic HTML data to JSON-LD
   * @param semanticData The semantic HTML data
   * @param url The current page URL
   * @returns JSON-LD representation
   */
  fromSemanticHtml(semanticData: {
    headings: string[];
    lists: string[];
    tables: string[];
  }, url: string): JsonLdItem {
    const jsonLd: JsonLdItem = {
      '@context': this.defaultContext,
      '@type': 'WebPage',
      '@id': url,
      name: semanticData.headings[0] || 'Untitled',
      url: url,
    };

    // Add description from first heading or list
    if (semanticData.headings.length > 1) {
      jsonLd.description = semanticData.headings.slice(1).join(' ');
    } else if (semanticData.lists.length > 0) {
      jsonLd.description = semanticData.lists.slice(0, 3).join(' ');
    }

    // Add main content
    if (semanticData.lists.length > 0 || semanticData.tables.length > 0) {
      jsonLd.mainContentOfPage = {
        '@type': 'WebPageElement',
        text: [...semanticData.lists, ...semanticData.tables].join('\n'),
      };
    }

    return this.ensureContext(jsonLd);
  }
}

// Export singleton instance
export const jsonLdConverter = new JsonLdConverter();
