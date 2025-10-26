import { userPreferences } from '../services/userPreferences';
import { db } from '../services/database';

export default defineBackground(async () => {
  console.log('Background script loaded');
  
  // Initialize database first
  await db.checkAndRecreateIfNeeded();
  console.log('Background database initialized');
  
  console.log('Registering background message listener');
  
  browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    console.log('Background received message:', message.type, 'payload:', message);
    
    if (message.type === 'get-all-lists') {
      console.log('Processing get-all-lists request');
      
      (async () => {
        try {
          const lists = await db.listProjections.toArray();
          console.log('Fetched lists from database:', lists);
          const responseData = { data: { lists }, messageId: message.messageId };
          console.log('About to send response:', responseData);
          sendResponse(responseData);
          console.log('sendResponse called');
        } catch (error) {
          console.error('Error fetching lists:', error);
          sendResponse({ 
            error: error instanceof Error ? error.message : String(error), 
            messageId: message.messageId 
          });
        }
      })();
      
      return true; // Keep the channel open for async response
    }
  });
  
  console.log('Background message listener registered');
});
