import { microformatExtractor } from '../services/microformatExtractor';
import { promptApiService } from '../services/promptApiService';
import { type ListProjection } from '../services/database';
import { ref } from 'vue';
import { messaging } from '../utils/messaging';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    console.log('Content script loaded on:', window.location.href);
    
    // Initialize Prompt API service
    promptApiService.initialize();
    promptApiService.startCleanupTimer();
    
    // Reactive ref to store user lists
    const userLists = ref<ListProjection[]>([]);
    
    // Function to refresh lists from background script
    const refreshLists = async () => {
      try {
        const response = await messaging.send<{ type: 'get-all-lists'; payload: void; response: { lists: ListProjection[] } }>('get-all-lists', undefined);
        console.log('Fetched lists from background script:', response);
        userLists.value = response.lists;
        console.log(`📋 Loaded ${userLists.value.length} lists:`, userLists.value.map(l => l.name));
      } catch (error) {
        console.error('Failed to fetch lists:', error);
        userLists.value = [];
      }
    };
    
    // Extract and log microformats immediately
    const extractedData = microformatExtractor.extractAll();
    console.log('=== Microformat Extraction Results ===');
    console.log('URL:', extractedData.url);
    console.log('Title:', extractedData.title);
    console.log('Description:', extractedData.description);
    console.log('\nMicroformats:', JSON.stringify(extractedData.microformats, null, 2));
    console.log('Content Preview:', extractedData.content.substring(0, 200) + '...');
    console.log('=====================================');
    
    // Store extracted content in PromptApiService
    promptApiService.setExtractedContent(extractedData);
    
    // Create session WITHOUT passing microformats
    try {
      console.log('Creating session with page details tool');
      const session = await promptApiService.createSession();
      console.log('✅ Session created with page details tool');
      
      // Fetch user's lists after session is created
      await refreshLists();
      
      // Create available lists information for AI prompt
      const availableListsInfo = userLists.value.length > 0
        ? `Available Lists:\n${userLists.value.map(list => `  - ${list.name} (ID: ${list.id})${list.description ? ` - ${list.description}` : ''}`).join('\n')}`
        : 'No lists available yet.';
      
      // Send prompt to add microformats to list
      try {
        const response = await promptApiService.sendPrompt(`add microformats to list
          Page Details: 
          ${JSON.stringify(extractedData.microformats)}
          
          ${availableListsInfo}`);
        console.log('🤖 AI Response:', response);
      } catch (error) {
        console.log('⚠️ Could not send prompt:', error);
      }
    } catch (error) {
      console.log('⚠️ Could not create session:', error);
    }
  },
});
