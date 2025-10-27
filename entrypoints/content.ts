import { microformatExtractor } from '../services/microformatExtractor';
import { promptApiService } from '../services/promptApiService';
import { type ListProjection } from '../services/database';
import { ref } from 'vue';
import { messaging } from '../utils/messaging';

interface ScanResult {
  item: {
    id?: string;
    name: string;
    url: string;
    image?: string;
    description?: string;
    type: string;
    jsonLd: any;
  };
  listIds: string[];
  confidence: number;
  reasoning: string;
}

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
      
      // Process items and add them to lists
      try {
        // Filter to recipe-relevant data only
        const recipeData = promptApiService.filterRecipeData(extractedData.microformats);

        // If recipes were found in microformats, use them in the prompt
        const prompt = `Analyze this recipe content to determine if it should be added to any lists:

Page Information:
URL: ${extractedData.url}
Title: ${extractedData.title}
Description: ${extractedData.description}

${recipeData.recipes.length ? `
Found Recipes:
${recipeData.recipes.map(recipe => `
Name: ${recipe.name}
${recipe.description ? `Description: ${recipe.description}` : ''}
${recipe.cookTime ? `Cook Time: ${recipe.cookTime}` : ''}
${recipe.cuisine ? `Cuisine: ${recipe.cuisine}` : ''}
${recipe.ingredients?.length ? `Ingredients: ${recipe.ingredients.slice(0, 5).join(', ')}${recipe.ingredients.length > 5 ? '...' : ''}` : ''}
Source: ${recipe.source}
`).join('\n')}` : ''}

${availableListsInfo}`;

        const response = await promptApiService.sendPrompt(prompt);
        console.log('🤖 AI Response:', response);

        // Parse the response
        let items;
        try {
          items = JSON.parse(response);
          if (!Array.isArray(items)) {
            throw new Error('Response is not an array');
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          return;
        }

        // Process each item
        for (const suggestion of items) {
          try {
            // Validate required fields
            if (!suggestion.item || !suggestion.listIds || !Array.isArray(suggestion.listIds)) {
              console.error('Invalid item structure:', suggestion);
              continue;
            }

            if (suggestion.confidence < 0.94) {
              console.log('Low confidence item, skipping:', suggestion);
              continue;
            }

            // Ensure item has an ID (use page URL as fallback)
            if (!suggestion.item.id) {
              suggestion.item.id = extractedData.url;
            }

            // Ensure item has a URL
            if (!suggestion.item.url) {
              suggestion.item.url = extractedData.url;
            }

            // Create or get existing item through background script
            try {
              console.log('Sending create-item request:', suggestion.item);
              const createResponse = await messaging.send<CreateItemMessage>('create-item', {
                item: suggestion.item
              });
              
              if (!createResponse || !createResponse.item) {
                console.error('Failed to create item:', suggestion.item);
                console.error('Response:', createResponse);
                continue;
              }

              const item = createResponse.item;
              console.log('✅ Item created/found:', item.id);

              // Link item to lists through background script
              const linkResponse = await messaging.send<LinkItemToListsMessage>('link-item-to-lists', {
                itemId: item.id,
                listIds: suggestion.listIds
              });

              if (linkResponse.success) {
                console.log(`✅ Item ${item.id} linked to lists:`, linkResponse.linkedLists);
              } else {
                console.error(`Failed to link item ${item.id} to any lists`);
              }
            } catch (error) {
              console.error('Error processing item:', error);
              continue;
            }
          } catch (itemError) {
            console.error('Error processing item:', itemError);
            // Continue with next item
          }
        }

        // Check if we need to scan the page
        
        // Only scan page if no recipes were found in microformats
        if (items.length === 0 && !recipeData.recipes.length) {
          console.log('No recipes found in microformats, scanning page content...');
          const results = await promptApiService.scanPage(userLists.value, extractedData);
          console.log('🤖 Scanned items:', results);

          // Process each result
          for (const result of results as ScanResult[]) {
            if (result.confidence >= 0.7) {
              try {
                const createResponse = await messaging.send<CreateItemMessage>('create-item', {
                  item: result.item
                });
                
                if (createResponse?.item) {
                  await messaging.send<LinkItemToListsMessage>('link-item-to-lists', {
                    itemId: createResponse.item.id,
                    listIds: result.listIds
                  });
                }
              } catch (error) {
                console.error('Failed to process item:', error);
              }
            }
          }
        } else if (recipeData.recipes.length) {
          console.log('Recipes found in microformats, skipping page scan:', recipeData.recipes.length);
        }
      } catch (error) {
        console.log('⚠️ Could not send prompt:', error);
      }
    } catch (error) {
      console.log('⚠️ Could not create session:', error);
    }
  },
});
