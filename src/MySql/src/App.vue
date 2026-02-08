<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useTheme } from 'vuetify';
import ConnectionManager from './components/ConnectionManager.vue';
import QueryResults from './components/QueryResults.vue';

const currentView = ref('connections');
const theme = useTheme();

const isManualTheme = ref(false);

const toggleTheme = () => {
  isManualTheme.value = true;
  theme.global.name.value = theme.global.name.value === 'dark' ? 'light' : 'dark';
  document.documentElement.classList.add('manual-theme');
};

// Sync theme with data-theme attribute for visualizer CSS
watch(() => theme.global.name.value, (newTheme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
}, { immediate: true });

onMounted(() => {
  const app = document.getElementById('app');
  if (app && app.dataset.view) {
    currentView.value = app.dataset.view;
  }

  // Theme detection
  const updateThemeFromVSCode = () => {
    // If user manually toggled theme, don't auto-update from VS Code
    if (isManualTheme.value) return;

    const body = document.body;
    if (body.classList.contains('vscode-light')) {
      theme.global.name.value = 'light';
    } else if (body.classList.contains('vscode-dark') || body.classList.contains('vscode-high-contrast')) {
      theme.global.name.value = 'dark';
    }
  };

  updateThemeFromVSCode();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        updateThemeFromVSCode();
      }
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // Also listen for view change messages if needed
  window.addEventListener('message', (event) => {
    if (event.data.command === 'setView') {
      currentView.value = event.data.view;
    }
  });
});
</script>

<template>
  <v-app class="vscode-app full-height" :class="{ 'manual-theme': isManualTheme }">
    <div class="app-header d-flex align-center px-4 py-1 flex-shrink-0">
      <div class="text-caption font-weight-bold text-uppercase opacity-60">
        {{ currentView === 'results' ? 'QueryLens Results' : 'QueryLens Connections' }}
      </div>
      <v-spacer></v-spacer>
      <v-btn icon variant="text" density="comfortable" @click="toggleTheme" size="small"
        :title="theme.global.name.value === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'">
        <v-icon :icon="theme.global.name.value === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          size="small"></v-icon>
      </v-btn>
    </div>
    <v-main class="full-height">
      <ConnectionManager v-if="currentView === 'connections'" />
      <QueryResults v-else-if="currentView === 'results'" />
      <div v-else>
        Unknown View: {{ currentView }}
      </div>
    </v-main>
  </v-app>
</template>

<style>
/* Override Vuetify background to match VS Code */
.vscode-app {
  background: transparent !important;
  color: var(--vscode-foreground) !important;
  font-family: var(--vscode-font-family) !important;
  height: 100vh;
}

/* Global Manual Theme Overrides */
.manual-theme,
.manual-theme .vscode-app {
  background-color: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

.manual-theme .v-main {
  background-color: rgb(var(--v-theme-surface)) !important;
}

.manual-theme .v-card {
  background-color: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border-color: rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

/* Header */
.app-header {
  border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, rgba(128, 128, 128, 0.35)));
  background-color: var(--vscode-editor-background, var(--vscode-sideBar-background));
  z-index: 100;
  color: var(--vscode-foreground) !important;
}

.manual-theme .app-header {
  background-color: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border-bottom: 2px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

.app-header .v-btn,
.app-header .v-icon,
.app-header div {
  color: var(--vscode-foreground) !important;
  opacity: 1 !important;
}

.manual-theme .app-header .v-btn,
.manual-theme .app-header .v-icon,
.manual-theme .app-header div:not(.text-caption) {
  color: rgb(var(--v-theme-on-surface)) !important;
}

/* Specific component headers visibility */
.manual-theme .connection-header,
.manual-theme .connection-header .v-icon,
.manual-theme .connection-header .text-subtitle-1,
.manual-theme .results-header,
.manual-theme .results-header .text-subtitle-1 {
  color: rgb(var(--v-theme-on-surface)) !important;
  opacity: 1 !important;
}

/* Active Selection Fix */
.manual-theme .connection-item.v-list-item--active,
.manual-theme .connection-item--active {
  background-color: rgb(var(--v-theme-primary)) !important;
}

.manual-theme .connection-item.v-list-item--active .v-list-item-title,
.manual-theme .connection-item.v-list-item--active .v-list-item-subtitle,
.manual-theme .connection-item.v-list-item--active .v-icon,
.manual-theme .connection-item--active .v-list-item-title,
.manual-theme .connection-item--active .v-list-item-subtitle,
.manual-theme .connection-item--active .v-icon {
  color: rgb(var(--v-theme-on-primary)) !important;
  opacity: 1 !important;
}

/* Table fixes */
.manual-theme .v-data-table {
  background-color: transparent !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

.manual-theme .v-data-table .v-table__wrapper>table>thead>tr>th {
  background-color: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border-bottom: 2px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

.manual-theme .v-data-table .v-table__wrapper>table>tbody>tr>td {
  color: rgb(var(--v-theme-on-surface)) !important;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

.manual-theme .v-data-table .v-table__wrapper>table>tbody>tr:hover>td {
  background-color: rgba(var(--v-theme-on-surface), 0.05) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

/* Connection Items */
.manual-theme .connection-item {
  color: rgb(var(--v-theme-on-surface)) !important;
  opacity: 1 !important;
}

.manual-theme .connection-item .v-list-item-title,
.manual-theme .connection-item .v-list-item-subtitle {
  color: rgb(var(--v-theme-on-surface)) !important;
  opacity: 1 !important;
}

/* Secondary text/subtitle visibility */
.manual-theme .v-list-item-subtitle,
.manual-theme .text-caption {
  color: rgb(var(--v-theme-on-surface)) !important;
  opacity: 0.7 !important;
}

/* Input Fields */
.manual-theme .v-text-field,
.manual-theme .v-textarea {
  --v-input-background-color: rgb(var(--v-theme-surface));
  --v-input-border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  --v-text-field-label-color: rgb(var(--v-theme-on-surface));
}

.opacity-60 {
  opacity: 0.6 !important;
}

.manual-theme .opacity-60 {
  opacity: 0.8 !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

/* Divider */
.manual-theme .v-divider {
  opacity: 1 !important;
  border-color: rgba(var(--v-border-color), 0.15) !important;
}

.v-application,
.v-application__wrap {
  background: transparent !important;
  background-color: transparent !important;
  height: 100%;
}

.v-main,
main {
  background: transparent !important;
  background-color: transparent !important;
  flex: 1 1 auto;
  min-height: 0;
}

html,
body {
  overflow: hidden !important;
  /* Disable body scroll */
  height: 100% !important;
  margin: 0;
  padding: 0;
}

.full-height {
  display: flex;
  flex-direction: column;
}

/* Ensure v-main content area fills height */
.v-main__wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
