import { microformatExtractor } from '../services/microformatExtractor';
import { promptApiService } from '../services/promptApiService';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    console.log('Content script loaded on:', window.location.href);
    
    // Initialize Prompt API service
    promptApiService.initialize();
    promptApiService.startCleanupTimer();
    
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
      
      // Send prompt to add microformats to list
      try {
        const response = await promptApiService.sendPrompt(`add microformats to list
          Page Details: 
          ${JSON.stringify(extractedData.microformats)}`);
        console.log('🤖 AI Response:', response);
      } catch (error) {
        console.log('⚠️ Could not send prompt:', error);
      }
    } catch (error) {
      console.log('⚠️ Could not create session:', error);
    }
  },
});
