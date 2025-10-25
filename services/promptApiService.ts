/**
 * Prompt API Service
 * Integrates with Chrome's built-in Prompt API (Gemini Nano) for page analysis
 */

import { microformatExtractor, ExtractedContent } from './microformatExtractor';
import { userPreferences, ScannedItem } from './userPreferences';

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
  private sessions: Map<string, PromptSession> = new Map();
  private modelAvailability: 'readily' | 'after-download' | 'no' | 'unknown' = 'unknown';

  /**
   * Initialize the service and check model availability
   */
  async initialize(): Promise<void> {
    try {
      // Check if we're in a context where the Prompt API is available
      if (typeof window === 'undefined') {
        console.warn('Prompt API not available in background context');
        await userPreferences.setModelDownloadStatus('unavailable');
        return;
      }

      // Check if the Prompt API is available
      if (!('ai' in window) || !('languageModel' in (window as any).ai)) {
        console.warn('Prompt API not available');
        await userPreferences.setModelDownloadStatus('unavailable');
        return;
      }

      const availability = await (window as any).ai.languageModel.availability();
      this.modelAvailability = availability;
      
      switch (availability) {
        case 'readily':
          await userPreferences.setModelDownloadStatus('ready');
          break;
        case 'after-download':
          await userPreferences.setModelDownloadStatus('downloading');
          break;
        case 'no':
          await userPreferences.setModelDownloadStatus('unavailable');
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
      
      // Create or get session
      const session = await this.getOrCreateSession(listName, listDescription);
      
      // Generate prompt based on list context
      const prompt = this.generatePrompt(extractedContent, listName, listDescription);
      
      // Call the Prompt API
      const response = await this.callPromptApi(session, prompt);
      
      // Parse and filter results
      const items = this.parseResponse(response, extractedContent.url);
      
      // Filter by confidence threshold
      const confidenceThreshold = await userPreferences.getScanConfidence();
      const filteredItems = items.filter(item => item.confidence >= confidenceThreshold);
      
      // Store results if tabId provided
      if (tabId && filteredItems.length > 0) {
        await userPreferences.setScanResults(tabId, filteredItems);
      }
      
      return filteredItems;
    } catch (error) {
      console.error('Page scan failed:', error);
      return [];
    }
  }

  /**
   * Get or create a session for the given list context
   */
  private async getOrCreateSession(
    listName: string,
    listDescription?: string
  ): Promise<any> {
    const sessionKey = `${listName}-${listDescription || ''}`;
    
    // Check if we have an existing session
    const existing = this.sessions.get(sessionKey);
    if (existing && this.isSessionValid(existing)) {
      existing.lastUsed = new Date();
      return existing.session;
    }
    
    // Create new session
    try {
      const session = await (window as any).ai.languageModel.create();
      
      // Set up context for this list type
      const contextPrompt = this.generateContextPrompt(listName, listDescription);
      await session.append([{
        role: 'user',
        parts: [{ type: 'text', value: contextPrompt }],
      }]);
      
      const newSession: PromptSession = {
        session,
        createdAt: new Date(),
        lastUsed: new Date(),
      };
      
      this.sessions.set(sessionKey, newSession);
      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Check if a session is still valid (not too old)
   */
  private isSessionValid(session: PromptSession): boolean {
    const maxAge = 30 * 60 * 1000; // 30 minutes
    return Date.now() - session.createdAt.getTime() < maxAge;
  }

  /**
   * Generate context prompt for the session
   */
  private generateContextPrompt(listName: string, listDescription?: string): string {
    return `You are an AI assistant that helps users find relevant items for their lists. 
The current list is: "${listName}"
${listDescription ? `Description: "${listDescription}"` : ''}

Your task is to analyze webpage content and extract items that would be relevant to this list. 
Return only items that match the list's purpose and context.

Return your analysis as a JSON array of objects with this structure:
[
  {
    "title": "Item title",
    "description": "Brief description",
    "url": "Relevant URL if applicable",
    "confidence": 0.0-1.0,
    "type": "product|article|recipe|todo|other"
  }
]

Only include items with confidence >= 0.5. Be selective and relevant.`;
  }

  /**
   * Generate the main prompt for page analysis
   */
  private generatePrompt(
    content: ExtractedContent,
    listName: string,
    listDescription?: string
  ): string {
    const microformatInfo = this.formatMicroformatInfo(content.microformats);
    
    return `Analyze this webpage for items relevant to the list "${listName}".
${listDescription ? `List description: "${listDescription}"` : ''}

Page URL: ${content.url}
Page Title: ${content.title}
Page Description: ${content.description}

Microformat Data:
${microformatInfo}

Main Content (first 3000 chars):
${content.content.substring(0, 3000)}

Find items that match this list's purpose. Focus on the most relevant and actionable items.`;
  }

  /**
   * Format microformat data for the prompt
   */
  private formatMicroformatInfo(microformats: any): string {
    let info = '';
    
    if (microformats.schemaOrg?.length) {
      info += `Schema.org data: ${JSON.stringify(microformats.schemaOrg.slice(0, 3))}\n`;
    }
    
    if (microformats.openGraph && Object.keys(microformats.openGraph).length) {
      info += `Open Graph: ${JSON.stringify(microformats.openGraph)}\n`;
    }
    
    if (microformats.semantic?.headings?.length) {
      info += `Headings: ${microformats.semantic.headings.slice(0, 5).join(', ')}\n`;
    }
    
    if (microformats.semantic?.lists?.length) {
      info += `List items: ${microformats.semantic.lists.slice(0, 10).join(', ')}\n`;
    }
    
    return info || 'No structured data found';
  }

  /**
   * Call the Prompt API with the given session and prompt
   */
  private async callPromptApi(session: any, prompt: string): Promise<string> {
    try {
      // Use streaming for better performance
      const stream = session.promptStreaming(prompt);
      let response = '';
      
      for await (const chunk of stream) {
        response += chunk;
      }
      
      return response;
    } catch (error) {
      console.error('Prompt API call failed:', error);
      throw error;
    }
  }

  /**
   * Parse the API response into structured items
   */
  private parseResponse(response: string, pageUrl: string): ScannedItem[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No JSON array found in response');
        return [];
      }
      
      const items = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(items)) {
        console.warn('Response is not an array');
        return [];
      }
      
      return items.map((item: any) => ({
        title: item.title || 'Untitled',
        description: item.description || '',
        url: item.url || pageUrl,
        confidence: Math.max(0, Math.min(1, item.confidence || 0.5)),
        type: this.normalizeType(item.type),
        extractedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Failed to parse API response:', error);
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
   * Clean up old sessions
   */
  private cleanupSessions(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastUsed.getTime() > maxAge) {
        try {
          session.session.destroy();
        } catch (error) {
          console.warn('Failed to destroy session:', error);
        }
        this.sessions.delete(key);
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
   * Initialize periodic cleanup
   */
  startCleanupTimer(): void {
    // Clean up sessions every 30 minutes
    setInterval(() => {
      this.cleanupSessions();
    }, 30 * 60 * 1000);
  }
}

export const promptApiService = new PromptApiService();

