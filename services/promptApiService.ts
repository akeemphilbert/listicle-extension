/**
 * Prompt API Service
 * Integrates with Chrome's built-in Prompt API (Gemini Nano) for page analysis
 */

import { microformatExtractor, ExtractedContent } from './microformatExtractor';
import { userPreferences, ScannedItem } from './userPreferences';
import { z } from 'zod';

interface PromptSession {
  session: any; // LanguageModelSession
  createdAt: Date;
  lastUsed: Date;
}

interface PromptApiResponse {
  items: ScannedItem[];
  confidence: number;
  reasoning?: string;
}

class PromptApiService {
  private session: any | null = null; // LanguageModelSession
  private modelAvailability: 'readily' | 'after-download' | 'downloading' | 'no' | 'unknown' = 'unknown';
  private extractedContent: ExtractedContent | null = null;

  /**
   * Tool definition for getting user lists
   */
  private userListsTool = {
    name: "getUserLists",
    description: "Retrieves the current user's personalized lists for organizing items.",
    execute: async () => {
      // This is where your existing code to fetch user lists runs.
      // Return the lists, perhaps as a JSON string, for the model to process.
      return JSON.stringify(await this.getUserLists()); 
    },
  };

  /**
   * Tool definition for getting page details
   */
  private pageDetailsTool = {
    name: "getPageDetails",
    description: "Retrieves the extracted microformat data and content from the current webpage.",
    execute: async () => {
      if (!this.extractedContent) {
        return JSON.stringify({ error: "No page content available" });
      }
      return JSON.stringify(this.extractedContent.microformats);
    },
  };

  /**
   * Initialize the service and check model availability
   */
  async initialize(): Promise<void> {
    console.log('🚀 PromptApiService initialize() called');
    try {
      // Check if we're in a context where the Prompt API is available
      if (typeof window === 'undefined') {
        console.warn('Prompt API not available in background context');
        await userPreferences.setModelDownloadStatus('unavailable');
        return;
      }

      // Check if the Prompt API is available
      console.log('Checking Prompt API availability...');
      console.log('LanguageModel exists:', typeof LanguageModel !== 'undefined');
      
      if (typeof LanguageModel === 'undefined') {
        console.warn('Prompt API not available - LanguageModel not found');
        await userPreferences.setModelDownloadStatus('unavailable');
        return;
      }

      const availability = await LanguageModel.availability();
      this.modelAvailability = availability;
      
      switch (availability) {
        case 'readily':
          await userPreferences.setModelDownloadStatus('ready');
          console.log('✅ Prompt API ready - Model available for scanning');
          break;
        case 'after-download':
          await userPreferences.setModelDownloadStatus('downloading');
          console.log('📥 Prompt API needs download - Model not yet available');
          break;
        case 'downloading':
          await userPreferences.setModelDownloadStatus('downloading');
          console.log('⏳ Prompt API downloading - Model in progress');
          break;
        case 'no':
          await userPreferences.setModelDownloadStatus('unavailable');
          console.log('❌ Prompt API unavailable - Model not supported');
          break;
      }
    } catch (error) {
      console.error('Failed to initialize Prompt API:', error);
      await userPreferences.setModelDownloadStatus('unavailable');
    }
  }

  /**
   * Check if the model is ready to use
   */
  async isModelReady(): Promise<boolean> {
    // Check if we're in a context where the Prompt API is available
    if (typeof window === 'undefined') {
      return false;
    }

    if (this.modelAvailability === 'unknown') {
      await this.initialize();
    }
    return this.modelAvailability === 'readily';
  }

  /**
   * Check model availability and return detailed status
   */
  async checkAvailability(): Promise<{
    status: 'readily' | 'after-download' | 'downloading' | 'no';
    needsDownload: boolean;
    isDownloading: boolean;
  }> {
    if (typeof LanguageModel === 'undefined') {
      console.log('❌ Prompt API not available in this context');
      return { status: 'no', needsDownload: false, isDownloading: false };
    }

    const availability = await LanguageModel.availability();
    this.modelAvailability = availability;
    
    console.log(`🔍 Prompt API availability check: ${availability}`);
    
    return {
      status: availability,
      needsDownload: availability === 'after-download',
      isDownloading: availability === 'downloading'
    };
  }

  /**
   * Scan a page for items relevant to the active list
   */
  async scanPage(
    listName: string,
    listDescription?: string,
    tabId?: number
  ): Promise<ScannedItem[]> {
    try {
      // Check if model is ready
      if (!(await this.isModelReady())) {
        console.warn('Model not ready for scanning');
        return [];
      }

      // Extract content from the page
      const extractedContent = microformatExtractor.extractAll();
      
      
  
      return [];
    } catch (error) {
      console.error('Page scan failed:', error);
      return [];
    }
  }

  
  /**
   * Normalize item type
   */
  private normalizeType(type: string): ScannedItem['type'] {
    const normalized = type?.toLowerCase() || 'other';
    
    if (['product', 'article', 'recipe', 'todo'].includes(normalized)) {
      return normalized as ScannedItem['type'];
    }
    
    return 'other';
  }

  /**
   * Clean up old session
   */
  private cleanupSession(): void {
    if (this.session) {
      try {
        this.session.destroy();
        this.session = null;
      } catch (error) {
        console.warn('Failed to destroy session:', error);
      }
    }
  }

  /**
   * Get model availability status
   */
  getModelAvailability(): string {
    return this.modelAvailability;
  }

  /**
   * Check if the current page should be scanned
   */
  async shouldScanPage(url: string): Promise<boolean> {
    // Check if we're in a context where the Prompt API is available
    if (typeof window === 'undefined') {
      // In background context, we can't check model availability directly
      // Return true to let the content script handle the actual check
      return true;
    }

    // Check if auto-scan is enabled
    if (!(await userPreferences.isAutoScanEnabled())) {
      return false;
    }
    
    // Check if domain is excluded
    if (await userPreferences.isDomainExcluded(url)) {
      return false;
    }
    
    // Check if model is ready
    if (!(await this.isModelReady())) {
      return false;
    }
    
    return true;
  }

  /**
   * Get all user lists for the Prompt API
   * This provides the AI with context about available lists
   */
  async getUserLists(): Promise<Array<{
    id: string;
    name: string;
    description: string;
  }>> {
    try {
      // Import database dynamically to avoid circular dependencies
      const { db } = await import('./database');
      
      // Get all lists from the list projection
      const lists = await db.listProjections.toArray();
      
      // Return only id, name, and description
      return lists.map(list => ({
        id: list.id,
        name: list.name,
        description: list.description || '',
      }));
    } catch (error) {
      console.error('Failed to get user lists:', error);
      return [];
    }
  }

  /**
   * Get the user lists tool definition
   */
  getUserListsTool() {
    return this.userListsTool;
  }

  /**
   * Execute the user lists tool
   */
  async executeUserListsTool(): Promise<string> {
    return await this.userListsTool.execute();
  }

  /**
   * Get the page details tool definition
   */
  getPageDetailsTool() {
    return this.pageDetailsTool;
  }

  /**
   * Set extracted content for AI tool access
   */
  setExtractedContent(content: ExtractedContent): void {
    this.extractedContent = content;
    console.log('📄 Page content stored for AI tool access');
  }

  /**
   * Create session with download monitoring for models that need download
   */
  async createSessionWithDownload(
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const availability = await this.checkAvailability();
    
    if (availability.status === 'after-download') {
      const userLists = await this.userListsTool.execute();
      const pageDetails = await this.pageDetailsTool.execute();
      const systemContent = `You are an expert organizer. Before analyzing any input data, you must:
1. Review the user's current personalized lists
2. Review the extracted microformat data from the current page

User Lists:
${userLists}

Page Details:
${pageDetails}

 Determine which list, if any, the data should be added to. Respond only with the final JSON structure requested by the user.`;
      
      // Model needs download
      const session = await LanguageModel.create({
        monitor(m: any) {
          m.addEventListener('downloadprogress', (e: any) => {
            const progress = e.loaded * 100;
            console.log(`Downloaded ${progress}%`);
            if (onProgress) {
              onProgress(progress);
            }
          });
        },
        initialPrompts: [
          {
            role: "system",
            content: systemContent
          }
        ],
        tools: [this.userListsTool, this.pageDetailsTool]
      });
      this.session = session;
      console.log(`✅ Prompt API session created successfully with prompt ${systemContent}`);
      return session;
    } else if (availability.status === 'downloading') {
      // Model is currently downloading, listen for progress
      console.log('Model is downloading...');
      // Wait and retry or listen for completion
      throw new Error('Model is currently downloading, please wait');
    } else if (availability.status === 'readily') {
      // Model is ready, create session with parameters
      return await this.createSession();
    }
    
    throw new Error(`Cannot create session: ${availability.status}`);
  }

  /**
   * Create standard session with temperature/topK parameters
   */
  async createSession(): Promise<any> {
    const params = await LanguageModel.params();
    const userLists = await this.userListsTool.execute();
    
    // Build system prompt WITHOUT microformat data
    const systemContent = `You are an expert organizer. Before analyzing any input data, you must:
1. Review the user's current personalized lists
2. Review the extracted microformat data from the current page

 Determine which list, if any, the data should be added to. Respond only with the final JSON structure requested by the user.
 The item can be added to multiple lists.
 If there is no item id use the page url as the id
 Provide a detailed reasoning process for your decision.`;
      // Initializing a new session must either specify both `topK` and
    // `temperature` or neither of them.
    const session = await LanguageModel.create({
      temperature: Math.max(params.defaultTemperature * 1.2, 2.0),
      topK: params.defaultTopK,
      expectedInputs:[
        {
          type:"text",
          languages:["en"],
        }
      ],
      expectedOutputs:[
        {
          type:"text",
          languages:["en"],
        }
      ],
      initialPrompts: [
        {
          role: "system",
          content: systemContent
        }
      ]
    });
    
    this.session = session;
    console.log(`✅ Prompt API session created successfully with prompt ${systemContent}`);
    return session;
  }

  /**
   * Send a message as a prompt to the current session
   */
  async sendPrompt(message: string): Promise<string> {
    if (!this.session) {
      throw new Error('No active session. Create a session first.');
    }

    try {
      console.log('📤 Sending prompt:', message);
      const schema = {
        "type":"array",
        "items": {
          "type":"object",
          "properties": {
            "recipe": {
              "type":"object",
              "properties": {
                "name": {
                  "type": "string",
                },
                "description": {
                  "type": "string",
                },
                "ingredients": {
                  "type": "array",
                  "items": {
                    "type": "string",
                  },
                },
                "instructions": {
                  "type": "array",
                  "items": {
                    "type": "string",
                  },
                },
                "image": {
                  "type": "string",
                },
                "url": {
                  "type": "string",
                },
                "prepTime": {
                  "type": "string",
                },
                "cookTime": {
                  "type": "string",
                },
                "totalTime": {
                  "type": "string",
                },
                "yield": {
                  "type": "string",
                },
                "author": {
                  "type": "string",
                },
              },
            },
            "listId": {
              "type": "string",
            },
            "reasoning": {
              "type": "string",
            },
          },
        },
      }
      
      // Send the prompt to the session using the correct format
      const response = await this.session.prompt(message, {
        responseConstraint: schema,
      });
      
      console.log('📥 Received response:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to send prompt:', error);
      throw error;
    }
  }

  /**
   * Get download status for UI integration
   */
  getDownloadStatus(): {
    isAvailable: boolean;
    needsDownload: boolean;
    isDownloading: boolean;
    canEnable: boolean;
  } {
    return {
      isAvailable: this.modelAvailability === 'readily',
      needsDownload: this.modelAvailability === 'after-download',
      isDownloading: this.modelAvailability === 'downloading',
      canEnable: this.modelAvailability === 'after-download' || this.modelAvailability === 'readily'
    };
  }

  /**
   * Initialize periodic cleanup
   */
  startCleanupTimer(): void {
    // Clean up session every 30 minutes
    setInterval(() => {
      this.cleanupSession();
    }, 30 * 60 * 1000);
  }
}

export const promptApiService = new PromptApiService();

