<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { vscode } from '../utilities/vscode';
import Plan from '@visualizer/components/Plan.vue';

interface SavedState {
  results: any[];
  fields: any[];
  type: 'data' | 'explain' | 'visualizer';
  explainOutput: string;
  visualizerPlanSource: string;
  visualizerQuery: string;
  hasMore: boolean;
  error: string;
  page: number;
  pageSize: number;
  totalCount: number;
  isPaginationActive: boolean;
}

const results = ref<any[]>([]);
const fields = ref<any[]>([]);
const type = ref<'data' | 'explain' | 'visualizer'>('data');
const explainOutput = ref('');
const visualizerPlanSource = ref('');
const visualizerQuery = ref('');
const error = ref('');
const loading = ref(false);
const appending = ref(false);
const hasMore = ref(false); // Kept for backward compatibility if needed, though we use isPaginationActive now
const page = ref(1);
const pageSize = ref(50);
const totalCount = ref(0);
const isPaginationActive = ref(false);

const effectiveTotalCount = computed(() => {
  return totalCount.value > 0 ? totalCount.value : results.value.length;
});

const pageCount = computed(() => Math.ceil(effectiveTotalCount.value / pageSize.value) || 1);

const rangeStart = computed(() => {
  if (effectiveTotalCount.value === 0) return 0;
  return (page.value - 1) * pageSize.value + 1;
});

const rangeEnd = computed(() => {
  if (effectiveTotalCount.value === 0) return 0;
  return Math.min(page.value * pageSize.value, effectiveTotalCount.value);
});

const headers = computed(() => {
  return fields.value.map(f => ({
    title: f.name,
    key: f.name,
    sortable: false,
    type: f.type
  }));
});

const isDateType = (type: number) => {
  // MySQL type codes for DATE, DATETIME, TIMESTAMP, etc.
  return [7, 10, 12, 14, 17, 18].includes(type);
};

const formatValue = (value: any, type: number) => {
  if (value === null || value === undefined) return 'NULL';

  if (isDateType(type) && value) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString();
      }
    } catch (e) {
      return value;
    }
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value;
};

const goToPage = (newPage: number) => {
  if (!isPaginationActive.value) return;
  loading.value = true;
  vscode.postMessage({ command: 'goToPage', page: newPage });
};

const changePageSize = (newSize: number) => {
  if (!isPaginationActive.value) {
    // Just update locally if not paginating server-side, 
    // though for single page limit queries this is purely visual 
    // (and v-data-table-server doesn't slice so it changes nothing on rows)
    pageSize.value = newSize;
    return;
  }
  pageSize.value = newSize;
  loading.value = true;
  vscode.postMessage({ command: 'changePageSize', pageSize: newSize });
};

// Save state whenever relevant data changes
watch(
  [results, fields, type, explainOutput, visualizerPlanSource, visualizerQuery, hasMore, error, page, pageSize, totalCount, isPaginationActive],
  () => {
    vscode.setState({
      results: results.value,
      fields: fields.value,
      type: type.value,
      explainOutput: explainOutput.value,
      visualizerPlanSource: visualizerPlanSource.value,
      visualizerQuery: visualizerQuery.value,
      hasMore: hasMore.value,
      error: error.value,
      page: page.value,
      pageSize: pageSize.value,
      totalCount: totalCount.value,
      isPaginationActive: isPaginationActive.value
    });
  }
);

onMounted(() => {
  // Restore state
  const previousState = vscode.getState() as SavedState;
  if (previousState) {
    results.value = previousState.results || [];
    fields.value = previousState.fields || [];
    type.value = previousState.type || 'data';
    explainOutput.value = previousState.explainOutput || '';
    visualizerPlanSource.value = previousState.visualizerPlanSource || '';
    visualizerQuery.value = previousState.visualizerQuery || '';
    hasMore.value = previousState.hasMore || false;
    error.value = previousState.error || '';
    page.value = previousState.page || 1;
    pageSize.value = previousState.pageSize || 50;
    totalCount.value = previousState.totalCount || 0;
    isPaginationActive.value = previousState.isPaginationActive || false;
  }

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.command === 'setLoading') {
      loading.value = true;
      error.value = '';
      results.value = [];
      fields.value = [];
      hasMore.value = false;
      isPaginationActive.value = false;
    } else if (message.command === 'showResults') {
      loading.value = false;
      appending.value = false;
      type.value = 'data';

      if (message.data.append) {
        results.value = [...results.value, ...message.data.rows];
      } else {
        results.value = message.data.rows;
        fields.value = message.data.fields;
      }

      hasMore.value = !!message.data.hasMore;
      page.value = message.data.page || 1;
      pageSize.value = message.data.pageSize || 50;
      totalCount.value = message.data.totalCount || 0;
      isPaginationActive.value = !!message.data.isPaginationActive;
      error.value = '';
    } else if (message.command === 'showExplain') {
      loading.value = false;
      type.value = 'explain';
      explainOutput.value = message.data;
      error.value = '';
    } else if (message.command === 'showVisualizer') {
      loading.value = false;
      type.value = 'visualizer';
      visualizerPlanSource.value = JSON.stringify(message.data);
      visualizerQuery.value = message.query;
      error.value = '';
    } else if (message.command === 'showError') {
      loading.value = false;
      appending.value = false;
      error.value = message.error;
    }
  });
});
</script>

<template>
  <v-container fluid class="pa-4 h-100 d-flex flex-column">
    <!-- Loading -->
    <div v-if="loading" class="d-flex align-center justify-center flex-grow-1">
      <v-progress-circular indeterminate color="primary" size="64" class="mb-4"></v-progress-circular>
      <div class="text-h6 ml-4">Executing query...</div>
    </div>

    <div v-else class="h-100 d-flex flex-column">
      <!-- Error -->
      <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4 flex-shrink-0" @click:close="error = ''">
        {{ error }}
      </v-alert>

      <!-- Data -->
      <div v-if="type === 'data'" class="flex-grow-1 d-flex flex-column" style="min-height: 0;">
        <!-- <div class="d-flex align-center justify-space-between mb-2 flex-shrink-0 results-header">
          <div v-if="isPaginationActive" class="text-subtitle-1 font-weight-bold">
            Query Results (Page {{ page }} of {{ pageCount }}, {{ totalCount }} total rows)
          </div>
          <div v-else class="text-subtitle-1 font-weight-bold">
            Query Results ({{ results.length }} rows)
          </div>
        </div> -->

        <v-card class="flex-grow-1 d-flex flex-column overflow-hidden" border>
          <v-data-table-server v-if="results.length > 0" :headers="headers" :items="results"
            :items-length="effectiveTotalCount" v-model:page="page" :items-per-page="pageSize"
            :items-per-page-options="[10, 25, 50, 100, 500]" @update:page="goToPage"
            @update:items-per-page="changePageSize" density="compact" fixed-header class="h-100" hover>
            <template v-for="header in headers" :key="`h-${header.key}`" v-slot:[`header.${header.key}`]="{ column }">
              <div class="d-flex align-center">
                <span class="text-truncate d-inline-block" style="max-width: 250px;">
                  {{ column.title }}
                </span>
                <v-tooltip activator="parent" location="bottom" open-delay="300" max-width="400">
                  {{ column.title }}
                </v-tooltip>
              </div>
            </template>
            <template v-for="header in headers" :key="header.key" v-slot:[`item.${header.key}`]="{ value }">
              <span v-if="value === null || value === undefined" class="null-value">NULL</span>
              <span v-else-if="isDateType(header.type)" class="date-value">{{ formatValue(value, header.type) }}</span>
              <span v-else>{{ formatValue(value, header.type) }}</span>
            </template>
            <!-- Custom Pagination -->
            <template v-slot:bottom>
              <div class="d-flex align-center py-2" style="width: 100%; justify-content: center;"
                v-if="effectiveTotalCount > 0">
                <div class="pagination-container">
                  <!-- First Page -->
                  <v-btn icon variant="text" density="comfortable" :disabled="page === 1" @click="goToPage(1)"
                    size="small" class="pagination-btn">
                    <v-icon>mdi-page-first</v-icon>
                  </v-btn>

                  <!-- Previous Page -->
                  <v-btn icon variant="text" density="comfortable" :disabled="page === 1" @click="goToPage(page - 1)"
                    size="small" class="pagination-btn">
                    <v-icon>mdi-chevron-left</v-icon>
                  </v-btn>

                  <!-- Range / Page Size Selector -->
                  <v-menu location="top center">
                    <template v-slot:activator="{ props }">
                      <v-btn variant="text" density="compact" class="text-caption mx-1 px-2 pagination-text-btn"
                        v-bind="props" append-icon="mdi-chevron-down" height="28">
                        {{ rangeStart }}-{{ rangeEnd }}
                      </v-btn>
                    </template>
                    <v-list density="compact" class="pagination-menu rounded-xm" elevation="4">
                      <v-list-item v-for="size in [10, 25, 50, 100, 500]" :key="size" :value="size"
                        @click="changePageSize(size)" :active="pageSize === size" class="pagination-menu-item">
                        <v-list-item-title>{{ size }} rows per page</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>

                  <!-- Total Count -->
                  <span class="text-caption text-medium-emphasis mr-2">
                    of {{ effectiveTotalCount }}{{ hasMore ? '+' : '' }}
                  </span>

                  <!-- Next Page -->
                  <v-btn icon variant="text" density="comfortable" :disabled="page >= pageCount"
                    @click="goToPage(page + 1)" size="small" class="pagination-btn">
                    <v-icon>mdi-chevron-right</v-icon>
                  </v-btn>

                  <!-- Last Page -->
                  <v-btn icon variant="text" density="comfortable" :disabled="page >= pageCount"
                    @click="goToPage(pageCount)" size="small" class="pagination-btn">
                    <v-icon>mdi-page-last</v-icon>
                  </v-btn>
                </div>
              </div>
            </template>
          </v-data-table-server>
          <div v-else class="d-flex align-center justify-center h-100 text-medium-emphasis">
            No results found.
          </div>
        </v-card>
      </div>

      <!-- Explain -->
      <div v-if="type === 'explain'" class="flex-grow-1 d-flex flex-column" style="min-height: 0;">
        <div class="text-subtitle-1 font-weight-bold mb-2">Execution Plan</div>
        <v-card class="flex-grow-1 pa-0 overflow-hidden" border>
          <pre class="pa-4 h-100 overflow-auto code-block">{{ explainOutput }}</pre>
        </v-card>
      </div>

      <!-- Visualizer -->
      <div v-if="type === 'visualizer'" class="flex-grow-1 d-flex flex-column" style="min-height: 0; overflow: hidden;">
        <div class="d-flex tabs-container position-relative" style="z-index: 1000;">
          <div id="header-tabs" class="flex-grow-1"></div>
        </div>
        <Plan :planSource="visualizerPlanSource" :planQuery="visualizerQuery" class="h-100 w-100" />
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.code-block {
  font-family: var(--vscode-editor-font-family, 'Consolas', 'Courier New', monospace);
  font-size: var(--vscode-editor-font-size, 14px);
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

/* Data table styles */
:deep(.v-data-table) {
  background: transparent !important;
}



/* Table and container */
:deep(.v-table) {
  background: transparent !important;
}



:deep(.v-table__wrapper) {
  background: transparent !important;
}

/* Target the actual table element */
:deep(.v-table__wrapper > table) {
  background: transparent !important;
}

:deep(.v-table__wrapper > table > thead) {
  background: transparent !important;
}

:deep(.v-table__wrapper > table > tbody) {
  background: transparent !important;
}

/* Table header styles */
:deep(.v-data-table .v-table__wrapper > table > thead > tr > th) {
  background-color: var(--vscode-editorWidget-background, var(--vscode-sideBar-background)) !important;
  border-bottom: 2px solid var(--vscode-widget-border, var(--vscode-panel-border)) !important;
  z-index: 1;
  font-weight: 600;
}



/* Table body rows */
:deep(.v-data-table .v-table__wrapper > table > tbody > tr) {
  background-color: transparent !important;
  background: transparent !important;
}

:where(:deep(.v-data-table .v-table__wrapper > table > tbody > tr:hover)) {
  background-color: var(--vscode-list-hoverBackground) !important;
}

/* Table cells */
:deep(.v-data-table .v-table__wrapper > table > tbody > tr > td) {
  background: transparent !important;
  background-color: transparent !important;
  border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, rgba(128, 128, 128, 0.35))) !important;
}



/* Native VS Code styling for buttons */
.v-btn {
  text-transform: none;
  font-weight: 500;
}

/* Table footer styles */
:deep(.v-data-table-footer) {
  background-color: var(--vscode-editorWidget-background, var(--vscode-sideBar-background)) !important;
  border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)) !important;
  color: var(--vscode-editor-foreground) !important;
}

.null-value {
  font-style: italic;
  color: var(--vscode-descriptionForeground);
  opacity: 0.8;
}



.date-value {
  white-space: nowrap;
}

/* Card styling to match VS Code theme */
:deep(.v-card) {
  background-color: transparent !important;
  background: transparent !important;
  border-color: var(--vscode-widget-border, var(--vscode-panel-border)) !important;
}

.results-header {
  font-weight: 600;
}



.tabs-container {
  background-color: var(--vscode-editor-background, var(--vscode-sideBar-background)) !important;
  border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, rgba(128, 128, 128, 0.35))) !important;
}



/* Container background override */
:deep(.v-container) {
  background: transparent !important;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-container {
  background-color: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-widget-border, #454545);
  border-radius: 18px;
  /* High radius for pill shape */
  display: flex;
  align-items: center;
  padding: 0 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  height: 36px;
  position: relative;
  z-index: 10;
}

.pagination-btn {
  color: var(--vscode-icon-foreground, #C5C5C5) !important;
  opacity: 0.8;
}

.pagination-btn:hover {
  opacity: 1;
  background-color: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31)) !important;
}

.pagination-btn:disabled {
  opacity: 0.3;
}

/* Ensure text button looks good */
.pagination-text-btn {
  color: var(--vscode-foreground, #CCCCCC) !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  font-weight: 500;
  opacity: 0.9;
}

.pagination-text-btn:hover {
  background-color: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
}

.pagination-menu {
  background-color: var(--vscode-dropdown-background, #3C3C3C) !important;
  color: var(--vscode-dropdown-foreground, #F0F0F0) !important;
  border: 1px solid var(--vscode-widget-border, #454545);
}

:deep(.pagination-menu-item .v-list-item__overlay) {
  display: none !important;
}

:deep(.pagination-menu-item:hover),
:deep(.pagination-menu-item.v-list-item--active) {
  background-color: var(--vscode-list-hoverBackground, #2a2d2e) !important;
  color: var(--vscode-list-hoverForeground, #ffffff) !important;
}

:deep(.pagination-menu-item.v-list-item--active) {
  background-color: var(--vscode-list-activeSelectionBackground, #094771) !important;
  color: var(--vscode-list-activeSelectionForeground, #ffffff) !important;
}
</style>
