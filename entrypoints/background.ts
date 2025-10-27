import { userPreferences } from '../services/userPreferences';
import { db } from '../services/database';
import { createItemDirect, linkItemToListDirect } from '../services/itemService';
import { badgeManager } from '../services/badgeManager';
import type { Browser } from 'webextension-polyfill';

export default defineBackground(async () => {
  console.log('Background script loaded');
  
  // Initialize database first
  await db.checkAndRecreateIfNeeded();
  console.log('Background database initialized');

  // Listen for extension icon clicks to reset badge
  browser.action.onClicked.addListener(async () => {
    await badgeManager.reset();
  });
  
  console.log('Registering background message listener');
  
  browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    console.log('Background received message:', message.type, 'payload:', message);
    
    // Handle all async message processing
    (async () => {
      try {
        switch (message.type) {
          case 'get-all-lists':
            console.log('Processing get-all-lists request');
            const lists = await db.listProjections.toArray();
            console.log('Fetched lists from database:', lists);
            sendResponse({ data: { lists }, messageId: message.messageId });
            break;

          case 'create-item':
            console.log('Processing create-item request:', message.payload.item);
            const item = await createItemDirect(message.payload.item);
            console.log('Item created/found:', item);
            if (!item) {
              sendResponse({ 
                error: 'Failed to create item', 
                messageId: message.messageId 
              });
            } else {
              sendResponse({ 
                data: { item }, 
                messageId: message.messageId 
              });
            }
            break;

          case 'link-item-to-lists':
            console.log('Processing link-item-to-lists request:', message.payload);
            const { itemId, listIds } = message.payload;
            const linkedLists: string[] = [];

            // Link item to each list
            for (const listId of listIds) {
              try {
                const success = await linkItemToListDirect(itemId, listId);
                if (success) {
                  linkedLists.push(listId);
                  // Increment badge count when item is successfully linked to a list
                  await badgeManager.increment();
                }
              } catch (linkError) {
                console.error(`Failed to link item ${itemId} to list ${listId}:`, linkError);
              }
            }

            sendResponse({
              data: {
                success: linkedLists.length > 0,
                linkedLists
              },
              messageId: message.messageId
            });
            break;

          default:
            console.warn('Unknown message type:', message.type);
            sendResponse({
              error: `Unknown message type: ${message.type}`,
              messageId: message.messageId
            });
        }
      } catch (error) {
        console.error(`Error processing ${message.type}:`, error);
        sendResponse({ 
          error: error instanceof Error ? error.message : String(error), 
          messageId: message.messageId 
        });
      }
    })();
    
    return true; // Keep the channel open for async response
  });
  
  console.log('Background message listener registered');
});
