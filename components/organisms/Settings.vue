<template>
  <div class="settings">
    <h2 class="settings__title">Page Scanning Settings</h2>
    
    <div class="settings__section">
      <div class="settings__item">
        <label class="settings__label">
          <input 
            v-model="preferences.autoScanEnabled" 
            type="checkbox" 
            class="settings__checkbox"
            @change="updatePreferences"
          />
          Enable automatic page scanning
        </label>
        <p class="settings__description">
          Automatically scan pages for items when you navigate to new websites
        </p>
      </div>
      
      <div class="settings__item">
        <label class="settings__label">
          Scan confidence threshold: {{ Math.round(preferences.scanConfidence * 100) }}%
        </label>
        <input 
          v-model="preferences.scanConfidence" 
          type="range" 
          min="0" 
          max="1" 
          step="0.1"
          class="settings__slider"
          @change="updatePreferences"
        />
        <p class="settings__description">
          Only show items with confidence above this threshold
        </p>
      </div>
      
      <div class="settings__item">
        <label class="settings__label">Model Status</label>
        <div class="settings__status" :class="`settings__status--${modelStatus}`">
          {{ getStatusText(modelStatus) }}
        </div>
        <p class="settings__description">
          {{ getStatusDescription(modelStatus) }}
        </p>
        <div v-if="modelStatus === 'after-download'" class="settings__download-section">
          <p class="settings__download-text">
            The Gemini Nano model needs to be downloaded before you can use page scanning. 
            This requires user interaction and may take a few minutes.
          </p>
          <button 
            @click="triggerModelDownload"
            class="settings__download-btn"
          >
            Download Model
          </button>
        </div>
        <div v-if="modelStatus === 'downloading'" class="settings__download-section">
          <p class="settings__download-text">
            Downloading Gemini Nano model... This may take a few minutes.
            Please keep this tab open.
          </p>
          <div class="settings__progress">
            <div class="settings__progress-bar"></div>
          </div>
        </div>
        <div v-if="modelStatus === 'unavailable'" class="settings__download-section">
          <p class="settings__download-text">
            Gemini Nano is not available on this device. This could be due to:
          </p>
          <ul class="settings__requirements">
            <li>Insufficient storage space (need 22GB free)</li>
            <li>Incompatible hardware (need 4GB+ VRAM or 16GB+ RAM)</li>
            <li>Unsupported operating system</li>
            <li>Metered internet connection</li>
          </ul>
        </div>
      </div>
    </div>
    
    <div class="settings__section">
      <h3 class="settings__section-title">Excluded Domains</h3>
      <p class="settings__description">
        Pages from these domains will not be automatically scanned
      </p>
      
      <div class="settings__domains">
        <div 
          v-for="domain in preferences.excludedDomains" 
          :key="domain"
          class="settings__domain-item"
        >
          <span class="settings__domain-name">{{ domain }}</span>
          <button 
            @click="removeDomain(domain)"
            class="settings__remove-btn"
            title="Remove domain"
          >
            ×
          </button>
        </div>
        
        <div class="settings__add-domain">
          <input 
            v-model="newDomain" 
            type="text" 
            placeholder="Add domain (e.g., example.com)"
            class="settings__domain-input"
            @keyup.enter="addDomain"
          />
          <button 
            @click="addDomain"
            class="settings__add-btn"
            :disabled="!newDomain.trim()"
          >
            Add
          </button>
        </div>
      </div>
    </div>
    
    <div class="settings__section">
      <h3 class="settings__section-title">Manual Actions</h3>
      
      <div class="settings__actions">
        <button 
          @click="triggerScan"
          class="settings__action-btn"
          :disabled="!preferences.autoScanEnabled || modelStatus !== 'ready'"
        >
          Scan Current Page
        </button>
        
        <button 
          @click="clearAllResults"
          class="settings__action-btn settings__action-btn--secondary"
        >
          Clear All Scan Results
        </button>
      </div>
    </div>
    
    <div class="settings__section">
      <button 
        @click="resetToDefaults"
        class="settings__reset-btn"
      >
        Reset to Defaults
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { messaging } from '../../utils/messaging';
import { UserPreferences } from '../../services/userPreferences';

const preferences = ref<UserPreferences>({
  autoScanEnabled: true,
  scanConfidence: 0.7,
  excludedDomains: [],
  modelDownloadStatus: 'unknown'
});

const modelStatus = ref<'ready' | 'downloading' | 'after-download' | 'unavailable' | 'unknown'>('unknown');
const newDomain = ref('');

const getStatusText = (status: string) => {
  switch (status) {
    case 'ready': return 'Ready';
    case 'downloading': return 'Downloading...';
    case 'after-download': return 'Needs Download';
    case 'unavailable': return 'Unavailable';
    default: return 'Unknown';
  }
};

const getStatusDescription = (status: string) => {
  switch (status) {
    case 'ready': return 'Gemini Nano model is ready for page scanning';
    case 'downloading': return 'Downloading Gemini Nano model. This may take a few minutes.';
    case 'after-download': return 'Gemini Nano model needs to be downloaded before use';
    case 'unavailable': return 'Gemini Nano is not available on this device. Page scanning is disabled.';
    default: return 'Checking model availability...';
  }
};

const updatePreferences = async () => {
  try {
    await messaging.send('update-preferences', { preferences: preferences.value });
  } catch (error) {
    console.error('Failed to update preferences:', error);
  }
};

const addDomain = async () => {
  const domain = newDomain.value.trim();
  if (domain && !preferences.value.excludedDomains.includes(domain)) {
    preferences.value.excludedDomains.push(domain);
    newDomain.value = '';
    await updatePreferences();
  }
};

const removeDomain = async (domain: string) => {
  preferences.value.excludedDomains = preferences.value.excludedDomains.filter(d => d !== domain);
  await updatePreferences();
};

const triggerScan = async () => {
  try {
    // Get current tab ID
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      const result = await messaging.send('trigger-scan', { tabId: tabs[0].id });
      if (result.success) {
        console.log('Manual scan completed:', result.items);
      }
    }
  } catch (error) {
    console.error('Failed to trigger scan:', error);
  }
};

const clearAllResults = async () => {
  try {
    // This would need to be implemented in the background script
    console.log('Clear all results requested');
  } catch (error) {
    console.error('Failed to clear results:', error);
  }
};

const triggerModelDownload = async () => {
  try {
    // Trigger user interaction to start model download
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      // Inject a script to trigger model download
      await browser.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          // This will trigger the model download
          if ('ai' in window && 'languageModel' in (window as any).ai) {
            (window as any).ai.languageModel.create().catch(() => {
              // Ignore errors, this is just to trigger download
            });
          }
        }
      });
      
      // Update status
      await messaging.send('update-preferences', { 
        preferences: { modelDownloadStatus: 'downloading' } 
      });
      modelStatus.value = 'downloading';
    }
  } catch (error) {
    console.error('Failed to trigger model download:', error);
  }
};

const resetToDefaults = async () => {
  preferences.value = {
    autoScanEnabled: true,
    scanConfidence: 0.7,
    excludedDomains: [],
    modelDownloadStatus: 'unknown'
  };
  await updatePreferences();
};

const loadPreferences = async () => {
  try {
    const result = await messaging.send('get-preferences', undefined);
    preferences.value = result.preferences;
    
    const statusResult = await messaging.send('model-status', undefined);
    modelStatus.value = statusResult.status;
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }
};

onMounted(() => {
  loadPreferences();
});
</script>

<style scoped>
.settings {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.settings__title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #333;
}

.settings__section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e0e0e0;
}

.settings__section:last-child {
  border-bottom: none;
}

.settings__section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.settings__item {
  margin-bottom: 20px;
}

.settings__label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.settings__checkbox {
  margin-right: 8px;
}

.settings__slider {
  width: 100%;
  margin-bottom: 8px;
}

.settings__description {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.settings__status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.settings__status--ready {
  background: #e8f5e8;
  color: #2e7d32;
}

.settings__status--downloading {
  background: #fff3e0;
  color: #f57c00;
}

.settings__status--unavailable {
  background: #ffebee;
  color: #c62828;
}

.settings__status--unknown {
  background: #f5f5f5;
  color: #666;
}

.settings__domains {
  margin-top: 12px;
}

.settings__domain-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 6px;
  margin-bottom: 8px;
}

.settings__domain-name {
  font-family: monospace;
  font-size: 14px;
}

.settings__remove-btn {
  background: #ff5252;
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.settings__add-domain {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.settings__domain-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.settings__add-btn {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.settings__add-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.settings__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.settings__action-btn {
  padding: 10px 20px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.settings__action-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.settings__action-btn--secondary {
  background: #757575;
}

.settings__reset-btn {
  padding: 8px 16px;
  background: transparent;
  color: #f57c00;
  border: 1px solid #f57c00;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.settings__reset-btn:hover {
  background: #f57c00;
  color: white;
}

/* Model Download Section */
.settings__download-section {
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #2196F3;
}

.settings__download-text {
  font-size: 14px;
  color: #333;
  margin-bottom: 12px;
  line-height: 1.4;
}

.settings__download-btn {
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.settings__download-btn:hover {
  background: #1976D2;
}

.settings__progress {
  width: 100%;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
}

.settings__progress-bar {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #2196F3, #4CAF50);
  animation: progress-animation 2s ease-in-out infinite;
}

@keyframes progress-animation {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(0%); }
  100% { transform: translateX(100%); }
}

.settings__requirements {
  margin: 8px 0 0 16px;
  font-size: 13px;
  color: #666;
}

.settings__requirements li {
  margin-bottom: 4px;
}
</style>
