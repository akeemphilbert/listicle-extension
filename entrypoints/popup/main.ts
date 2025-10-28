import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import App from './App.vue';
import { badgeManager } from '../../services/badgeManager';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

// Mark extension as viewed when popup opens
await badgeManager.markViewed();

app.mount('#app');
