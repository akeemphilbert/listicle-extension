<template>
  <header class="header">
    <div class="header__left">
      <button class="header__icon-btn" @click="$emit('toggle-menu')">
        <span class="icon">☰</span>
      </button>
      <button class="header__icon-btn" @click="$emit('home')">
        <span class="icon">🏠</span>
      </button>
      <div class="header__search">
        <input type="text" placeholder="Find" class="header__search-input" />
      </div>
    </div>
    <div class="header__right">
      <button class="header__icon-btn" @click="$emit('add')">
        <span class="icon">+</span>
      </button>
      <button class="header__icon-btn" @click="$emit('notifications')">
        <span class="icon">🔔</span>
      </button>
      <button class="header__icon-btn" @click="$emit('settings')">
        <span class="icon">⚙️</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineEmits<{
  'toggle-menu': [];
  home: [];
  add: [];
  notifications: [];
  settings: [];
}>();
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #db4c3f;
  padding: 0.5rem 0.75rem;
  gap: 0.75rem;
}

.header__left,
.header__right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.header__icon-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  font-size: 1rem;
}

.header__icon-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.header__search {
  flex: 1;
  max-width: 200px;
}

.header__search-input {
  width: 100%;
  background-color: rgba(255, 255, 255, 0.2);
  border: none;
  padding: 0.375rem 0.5rem;
  border-radius: 4px;
  color: white;
  font-size: 0.875rem;
}

.header__search-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.header__search-input:focus {
  outline: none;
  background-color: rgba(255, 255, 255, 0.3);
}

.icon {
  font-style: normal;
}
</style>
