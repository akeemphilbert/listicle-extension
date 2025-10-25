/**
 * Messaging utilities using native browser messaging for type-safe communication
 */

import { ScannedItem } from '../services/userPreferences';
import { ListProjection } from '@/services/database';
import { UserPreferences } from '../services/userPreferences';

// Define message types
export interface ScanPageMessage {
  type: 'scan-page';
  payload: { content: string; microformats: any; url: string; tabId: number };
  response: { success: boolean; items?: ScannedItem[] };
}

export interface ScanPageContentMessage {
  type: 'scan-page-content';
  payload: { listName: string; listDescription: string; tabId: number };
  response: { items: ScannedItem[] };
}

export interface ItemsFoundMessage {
  type: 'items-found';
  payload: { items: ScannedItem[]; tabId: number; listName: string };
  response: void;
}

export interface AddItemsMessage {
  type: 'add-items';
  payload: { listId: string; items: ScannedItem[] };
  response: { added: number; failed: number };
}

export interface GetActiveListMessage {
  type: 'get-active-list';
  payload: void;
  response: { list: ListProjection | null };
}

export interface SetActiveListMessage {
  type: 'set-active-list';
  payload: { listId: string | null };
  response: { success: boolean };
}

export interface UpdatePreferencesMessage {
  type: 'update-preferences';
  payload: { preferences: Partial<UserPreferences> };
  response: { success: boolean };
}

export interface GetPreferencesMessage {
  type: 'get-preferences';
  payload: void;
  response: { preferences: UserPreferences };
}

export interface GetScanResultsMessage {
  type: 'get-scan-results';
  payload: { tabId: number };
  response: { items: ScannedItem[] };
}

export interface ClearScanResultsMessage {
  type: 'clear-scan-results';
  payload: { tabId: number };
  response: { success: boolean };
}

export interface ModelStatusMessage {
  type: 'model-status';
  payload: void;
  response: { status: 'ready' | 'downloading' | 'unavailable' | 'unknown' };
}

export interface TriggerScanMessage {
  type: 'trigger-scan';
  payload: { tabId: number };
  response: { success: boolean; items?: ScannedItem[] };
}

export type Message = 
  | ScanPageMessage
  | ScanPageContentMessage
  | ItemsFoundMessage
  | AddItemsMessage
  | GetActiveListMessage
  | SetActiveListMessage
  | UpdatePreferencesMessage
  | GetPreferencesMessage
  | GetScanResultsMessage
  | ClearScanResultsMessage
  | ModelStatusMessage
  | TriggerScanMessage;

// Helper functions for common message patterns
export const messaging = {
  /**
   * Send a message and wait for response
   */
  async send<T extends Message>(
    message: T['type'],
    payload: T['payload']
  ): Promise<T['response']> {
    return new Promise((resolve, reject) => {
      const messageId = Math.random().toString(36);
      
      const responseHandler = (response: any) => {
        if (response.messageId === messageId) {
          browser.runtime.onMessage.removeListener(responseHandler);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.data);
          }
        }
      };
      
      browser.runtime.onMessage.addListener(responseHandler);
      
      browser.runtime.sendMessage({
        type: message,
        payload,
        messageId
      }).catch(reject);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        browser.runtime.onMessage.removeListener(responseHandler);
        reject(new Error('Message timeout'));
      }, 30000);
    });
  },

  /**
   * Listen for messages
   */
  on<T extends Message>(
    message: T['type'],
    handler: (payload: T['payload'], sender: any) => Promise<T['response']>
  ): void {
    browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      if (message.type === message) {
        try {
          const response = await handler(message.payload, sender);
          sendResponse({ data: response, messageId: message.messageId });
        } catch (error) {
          sendResponse({ error: error instanceof Error ? error.message : String(error), messageId: message.messageId });
        }
        return true; // Keep the message channel open for async response
      }
    });
  },

  /**
   * Send a message without waiting for response
   */
  async sendFireAndForget<T extends Message>(
    message: T['type'],
    payload: T['payload']
  ): Promise<void> {
    try {
      await browser.runtime.sendMessage({
        type: message,
        payload
      });
    } catch (error) {
      // Ignore errors for fire-and-forget messages
      console.warn('Fire-and-forget message failed:', error);
    }
  },
};
