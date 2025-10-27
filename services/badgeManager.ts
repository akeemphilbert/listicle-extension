import type { Browser } from 'webextension-polyfill';

/**
 * BadgeManager service
 * Handles the extension badge state, display, and persistence
 */
export class BadgeManager {
  private static readonly STORAGE_KEY = 'badgeData';
  private static readonly MAX_COUNT = 99;

  constructor() {
    this.initializeBadge();
  }

  /**
   * Initialize badge state from storage
   */
  private async initializeBadge(): Promise<void> {
    const data = await this.getBadgeData();
    await this.setBadgeCount(data.badgeCount);
    await this.setBadgeColor();
  }

  /**
   * Set badge background color
   */
  private async setBadgeColor(): Promise<void> {
    await browser.action.setBadgeBackgroundColor({ color: '#FF0000' });
  }

  /**
   * Get badge data from storage
   */
  private async getBadgeData(): Promise<{ badgeCount: number; lastResetTime: number }> {
    const result = await browser.storage.local.get(BadgeManager.STORAGE_KEY);
    return result[BadgeManager.STORAGE_KEY] || { badgeCount: 0, lastResetTime: Date.now() };
  }

  /**
   * Save badge data to storage
   */
  private async saveBadgeData(data: { badgeCount: number; lastResetTime: number }): Promise<void> {
    await browser.storage.local.set({ [BadgeManager.STORAGE_KEY]: data });
  }

  /**
   * Set badge count and update display
   */
  private async setBadgeCount(count: number): Promise<void> {
    const displayText = count > BadgeManager.MAX_COUNT ? '99+' : count > 0 ? count.toString() : '';
    await browser.action.setBadgeText({ text: displayText });
  }

  /**
   * Increment badge count
   */
  async increment(): Promise<void> {
    const data = await this.getBadgeData();
    data.badgeCount++;
    await this.saveBadgeData(data);
    await this.setBadgeCount(data.badgeCount);
  }

  /**
   * Reset badge count
   */
  async reset(): Promise<void> {
    await this.saveBadgeData({ badgeCount: 0, lastResetTime: Date.now() });
    await this.setBadgeCount(0);
  }

  /**
   * Get current badge count
   */
  async getCount(): Promise<number> {
    const data = await this.getBadgeData();
    return data.badgeCount;
  }
}

// Export singleton instance
export const badgeManager = new BadgeManager();
