import { promptApiService } from '../services/promptApiService';
import { userPreferences } from '../services/userPreferences';
import { messaging } from '../utils/messaging';

export default defineBackground(() => {
  console.log('Background script loaded');
  
  // Initialize the Prompt API service
  promptApiService.initialize();
  promptApiService.startCleanupTimer();
  
  // Listen for tab updates (page navigation)
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only scan when page is fully loaded
    if (changeInfo.status === 'complete' && tab.url) {
      try {
        // Check if we should scan this page
        if (!(await promptApiService.shouldScanPage(tab.url))) {
          return;
        }
        
        // Get active list
        const activeListId = await userPreferences.getActiveListId();
        if (!activeListId) {
          console.log('No active list, skipping scan');
          return;
        }
        
        // Inject content script if not already present
        await browser.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        
        // Send message to content script to start scanning
        await messaging.sendFireAndForget('scan-page', {
          content: '',
          microformats: {},
          url: tab.url,
          tabId: tabId
        });
      } catch (error) {
        console.error('Failed to initiate page scan:', error);
      }
    }
  });
  
  // Handle messages from content script
  messaging.on('scan-page', async (payload) => {
    try {
      const { content, microformats, url, tabId } = payload;
      
      // Get active list info
      const activeListId = await userPreferences.getActiveListId();
      if (!activeListId) {
        return { success: false };
      }
      
      // Get list details from storage
      const list = await listService.loadListFromEvents(activeListId);
      if (!list) {
        return { success: false };
      }
      
      // Send message to content script to scan the page
      const result = await messaging.send('scan-page-content', {
        listName: list.name,
        listDescription: list.metadata.description || '',
        tabId: tabId
      });
      
      const items = result?.items || [];
      
      if (items.length > 0) {
        // Notify content script about found items
        await messaging.sendFireAndForget('items-found', {
          items,
          tabId,
          listName: list.name
        });
        
        // Show notification
        await browser.notifications.create({
          type: 'basic',
          iconUrl: 'icon/48.png',
          title: 'Items Found!',
          message: `Found ${items.length} items for "${list.name}"`
        });
      }
      
      return { success: true, items };
    } catch (error) {
      console.error('Page scan failed:', error);
      return { success: false };
    }
  });
  
  // Handle requests to add items to list
  messaging.on('add-items', async (payload) => {
    try {
      const { listId, items } = payload;
      let added = 0;
      let failed = 0;
      
      // TODO: Implement actual task creation
      // This should integrate with the existing task system
      for (const item of payload.items) {
        try {
          // Create task from scanned item
          // await createTask({
          //   list_id: listId,
          //   title: item.title,
          //   description: item.description || '',
          // });
          added++;
        } catch (error) {
          console.error('Failed to add item:', error);
          failed++;
        }
      }
      
      return { added, failed };
    } catch (error) {
      console.error('Failed to add items:', error);
      return { added: 0, failed: payload.items.length };
    }
  });
  
  // Handle active list management
  messaging.on('get-active-list', async () => {
    const activeListId = await userPreferences.getActiveListId();
    // TODO: Get actual list object from storage
    return { list: activeListId ? { 
      id: activeListId, 
      name: 'Current List',
      icon: 'list',
      color: '#808080',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : null };
  });
  
  messaging.on('set-active-list', async (payload) => {
    await userPreferences.setActiveListId(payload.listId);
    return { success: true };
  });
  
  // Handle preferences
  messaging.on('update-preferences', async (payload) => {
    try {
      await userPreferences.updatePreferences(payload.preferences);
      return { success: true };
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return { success: false };
    }
  });
  
  messaging.on('get-preferences', async () => {
    const preferences = await userPreferences.getPreferences();
    return { preferences };
  });
  
  // Handle scan results
  messaging.on('get-scan-results', async (payload) => {
    const items = await userPreferences.getScanResults(payload.tabId);
    return { items };
  });
  
  messaging.on('clear-scan-results', async (payload) => {
    await userPreferences.clearScanResults(payload.tabId);
    return { success: true };
  });
  
  // Handle model status
  messaging.on('model-status', async () => {
    const status = await userPreferences.getModelDownloadStatus();
    return { status };
  });
  
  // Handle manual scan trigger
  messaging.on('trigger-scan', async (payload) => {
    try {
      const { tabId } = payload;
      
      // Get active list
      const activeListId = await userPreferences.getActiveListId();
      if (!activeListId) {
        return { success: false };
      }
      
      // For recipe testing, use specific recipe-focused prompts
      const listName = 'Test Recipes';
      const listDescription = 'A list for testing recipe extraction from web pages. Focus on finding recipes, ingredients, cooking instructions, and food-related content.';
      
      // Send message to content script to scan the page
      const result = await messaging.send('scan-page-content', {
        listName: listName,
        listDescription: listDescription,
        tabId: tabId
      });
      
      const items = result?.items || [];
      
      return { success: true, items };
    } catch (error) {
      console.error('Manual scan failed:', error);
      return { success: false };
    }
  });
});
