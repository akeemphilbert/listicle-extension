import { userPreferences } from '../services/userPreferences';
import { messaging } from '../utils/messaging';

export default defineBackground(() => {
  console.log('Background script loaded');
  
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
});
