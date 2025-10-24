import { microformatExtractor } from '../services/microformatExtractor';
import { messaging } from '../utils/messaging';
import { promptApiService } from '../services/promptApiService';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('Content script loaded on:', window.location.href);
    
    // Listen for messages from background script
    messaging.on('scan-page', async (payload) => {
      await performPageScan(payload.tabId);
      return { success: true };
    });
    
    messaging.on('scan-page-content', async (payload) => {
      const items = await promptApiService.scanPage(payload.listName, payload.listDescription, payload.tabId);
      return { items };
    });
    
    messaging.on('items-found', async (payload) => {
      showScanNotification(payload.items, payload.listName);
    });
    
    // Auto-scan after page load (with delay to ensure content is ready)
    setTimeout(() => {
      performPageScan();
    }, 2000);
  },
});

async function performPageScan(tabId?: number) {
  try {
    // Extract content and microformats
    const extractedContent = microformatExtractor.extractAll();
    
    // Send to background script for processing
    const response = await messaging.send('scan-page', {
      content: extractedContent.content,
      microformats: extractedContent.microformats,
      url: extractedContent.url,
      tabId: tabId || 0
    });
    
    if (response.success && response.items && response.items.length > 0) {
      showScanNotification(response.items, 'Current List');
    }
  } catch (error) {
    console.error('Page scan failed:', error);
  }
}

function showScanNotification(items: any[], listName: string) {
  // Remove any existing notifications
  const existingNotification = document.querySelector('.listicle-scan-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'listicle-scan-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 320px;
    cursor: pointer;
  `;
  
  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center;">
      <span style="margin-right: 8px;">📝</span>
      Items Found!
    </div>
    <div style="margin-bottom: 12px;">
      Found ${items.length} items for "${listName}"
    </div>
    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
      <button id="add-all-items" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Add All</button>
      <button id="dismiss-notification" style="
        background: rgba(255,255,255,0.1);
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Dismiss</button>
    </div>
    <div style="font-size: 12px; opacity: 0.8;">
      Click to view details
    </div>
  `;
  
  // Add event listeners
  notification.addEventListener('click', async (e) => {
    if (e.target === notification || (e.target as HTMLElement).id === 'add-all-items') {
      try {
        // Get active list ID
        const activeList = await messaging.send('get-active-list', {});
        if (activeList.list) {
          const result = await messaging.send('add-items', {
            listId: activeList.list.id,
            items: items
          });
          
          if (result.added > 0) {
            notification.style.background = '#2E7D32';
            notification.innerHTML = `
              <div style="font-weight: 600; margin-bottom: 8px;">✅ Added!</div>
              <div>Added ${result.added} items to "${listName}"</div>
            `;
            setTimeout(() => notification.remove(), 3000);
          }
        }
      } catch (error) {
        console.error('Failed to add items:', error);
      }
    } else if ((e.target as HTMLElement).id === 'dismiss-notification') {
      notification.remove();
    }
  });
  
  document.body.appendChild(notification);
  
  // Auto-remove after 15 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 15000);
}
