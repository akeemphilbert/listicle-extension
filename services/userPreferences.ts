/**
 * User Preferences Service
 * Manages user preferences for page scanning using WXT's storage API
 */

export interface UserPreferences {
  autoScanEnabled: boolean;
  scanConfidence: number;
  excludedDomains: string[];
  modelDownloadStatus: 'ready' | 'downloading' | 'unavailable' | 'unknown';
}

// Define storage items using WXT's storage API
export const autoScanEnabled = storage.defineItem('sync:preferences:autoScanEnabled', {
  defaultValue: true,
});

export const scanConfidence = storage.defineItem('sync:preferences:scanConfidence', {
  defaultValue: 0.7,
});

export const excludedDomains = storage.defineItem('sync:preferences:excludedDomains', {
  defaultValue: [] as string[],
});

export const modelDownloadStatus = storage.defineItem('local:preferences:modelDownloadStatus', {
  defaultValue: 'unknown' as UserPreferences['modelDownloadStatus'],
});

export const activeListId = storage.defineItem('local:activeListId', {
  defaultValue: null as string | null,
});

export const scanResults = storage.defineItem('local:scanResults', {
  defaultValue: {} as Record<string, ScannedItem[]>,
});

export interface ScannedItem {
  title: string;
  description?: string;
  url?: string;
  confidence: number;
  type: 'product' | 'article' | 'recipe' | 'todo' | 'other';
  extractedAt: string;
}

class UserPreferencesService {
  /**
   * Get all user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    return {
      autoScanEnabled: await autoScanEnabled.getValue(),
      scanConfidence: await scanConfidence.getValue(),
      excludedDomains: await excludedDomains.getValue(),
      modelDownloadStatus: await modelDownloadStatus.getValue(),
    };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    if (preferences.autoScanEnabled !== undefined) {
      await autoScanEnabled.setValue(preferences.autoScanEnabled);
    }
    if (preferences.scanConfidence !== undefined) {
      await scanConfidence.setValue(preferences.scanConfidence);
    }
    if (preferences.excludedDomains !== undefined) {
      await excludedDomains.setValue(preferences.excludedDomains);
    }
    if (preferences.modelDownloadStatus !== undefined) {
      await modelDownloadStatus.setValue(preferences.modelDownloadStatus);
    }
  }

  /**
   * Check if auto-scanning is enabled
   */
  async isAutoScanEnabled(): Promise<boolean> {
    return await autoScanEnabled.getValue();
  }

  /**
   * Enable or disable auto-scanning
   */
  async setAutoScanEnabled(enabled: boolean): Promise<void> {
    await autoScanEnabled.setValue(enabled);
  }

  /**
   * Get scan confidence threshold
   */
  async getScanConfidence(): Promise<number> {
    return await scanConfidence.getValue();
  }

  /**
   * Set scan confidence threshold
   */
  async setScanConfidence(confidence: number): Promise<void> {
    await scanConfidence.setValue(Math.max(0, Math.min(1, confidence)));
  }

  /**
   * Get excluded domains
   */
  async getExcludedDomains(): Promise<string[]> {
    return await excludedDomains.getValue();
  }

  /**
   * Add a domain to excluded list
   */
  async addExcludedDomain(domain: string): Promise<void> {
    const domains = await excludedDomains.getValue();
    if (!domains.includes(domain)) {
      await excludedDomains.setValue([...domains, domain]);
    }
  }

  /**
   * Remove a domain from excluded list
   */
  async removeExcludedDomain(domain: string): Promise<void> {
    const domains = await excludedDomains.getValue();
    await excludedDomains.setValue(domains.filter(d => d !== domain));
  }

  /**
   * Check if a domain is excluded
   */
  async isDomainExcluded(url: string): Promise<boolean> {
    const domains = await excludedDomains.getValue();
    try {
      const urlObj = new URL(url);
      return domains.some(domain => 
        urlObj.hostname === domain || 
        urlObj.hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  }

  /**
   * Get current active list ID
   */
  async getActiveListId(): Promise<string | null> {
    return await activeListId.getValue();
  }

  /**
   * Set active list ID
   */
  async setActiveListId(listId: string | null): Promise<void> {
    await activeListId.setValue(listId);
  }

  /**
   * Get scan results for a tab
   */
  async getScanResults(tabId: number): Promise<ScannedItem[]> {
    const results = await scanResults.getValue();
    return results[tabId.toString()] || [];
  }

  /**
   * Set scan results for a tab
   */
  async setScanResults(tabId: number, items: ScannedItem[]): Promise<void> {
    const results = await scanResults.getValue();
    await scanResults.setValue({
      ...results,
      [tabId.toString()]: items,
    });
  }

  /**
   * Clear scan results for a tab
   */
  async clearScanResults(tabId: number): Promise<void> {
    const results = await scanResults.getValue();
    const newResults = { ...results };
    delete newResults[tabId.toString()];
    await scanResults.setValue(newResults);
  }

  /**
   * Clear all scan results
   */
  async clearAllScanResults(): Promise<void> {
    await scanResults.setValue({});
  }

  /**
   * Get model download status
   */
  async getModelDownloadStatus(): Promise<UserPreferences['modelDownloadStatus']> {
    return await modelDownloadStatus.getValue();
  }

  /**
   * Set model download status
   */
  async setModelDownloadStatus(status: UserPreferences['modelDownloadStatus']): Promise<void> {
    await modelDownloadStatus.setValue(status);
  }

  /**
   * Reset all preferences to defaults
   */
  async resetToDefaults(): Promise<void> {
    await autoScanEnabled.setValue(true);
    await scanConfidence.setValue(0.7);
    await excludedDomains.setValue([]);
    await modelDownloadStatus.setValue('unknown');
  }
}

export const userPreferences = new UserPreferencesService();
