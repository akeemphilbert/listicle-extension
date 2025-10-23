import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  entrypointsDir: './entrypoints',
  manifest: {
    permissions: [
      'activeTab',
      'storage',
      'notifications',
      'scripting',
      'tabs'
    ],
    host_permissions: ['<all_urls>']
  }
});
