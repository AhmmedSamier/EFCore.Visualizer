<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { vscode } from '../utilities/vscode';
import { useTheme } from 'vuetify';

// Types
interface ConnectionConfig {
  id?: string;
  name: string;
  host: string;
  port: number;
  user: string;
  database: string;
  password?: string;
}

interface TestResult {
  success: boolean;
  message: string;
}

// Refs
const connections = ref<ConnectionConfig[]>([]);
const databases = ref<string[]>([]);
const activeConnectionId = ref<string | null>(null);
const dialog = ref(false);
const isEditing = ref(false);
const isTesting = ref(false);
const isLoadingDatabases = ref(false);
const testResult = ref<TestResult | null>(null);
const editedConnection = reactive<ConnectionConfig>({
  id: undefined,
  name: '',
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  database: '',
  password: '',
});

const theme = useTheme();

// Computed properties
const dialogTitle = computed(() => isEditing.value ? 'Edit Connection' : 'Add New Connection');
const saveButtonText = computed(() => isEditing.value ? 'Save Changes' : 'Add Connection');
const isFormValid = computed(() => {
  return editedConnection.name && editedConnection.host && editedConnection.port && editedConnection.user;
});

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.command) {
      case 'setConnections':
        connections.value = message.connections;
        if (message.activeConnectionId !== undefined) {
          activeConnectionId.value = message.activeConnectionId;
          vscode.setState({ activeConnectionId: message.activeConnectionId });
        }
        break;
      case 'testResult':
        isTesting.value = false;
        testResult.value = message.result;
        break;
      case 'databasesList':
        isLoadingDatabases.value = false;
        databases.value = message.databases;
        break;
      case 'databasesError':
        isLoadingDatabases.value = false;
        testResult.value = { success: false, message: "Failed to fetch databases: " + message.message };
        break;
    }
  });

  // Load initial state from VS Code
  const vscodeState = vscode.getState() as any;
  if (vscodeState?.activeConnectionId) {
    activeConnectionId.value = vscodeState.activeConnectionId;
  }

  // Request connections from the backend
  vscode.postMessage({ command: 'getConnections' });
});

// Methods
function openAddDialog() {
  isEditing.value = false;
  // Reset form to defaults
  Object.assign(editedConnection, {
    id: undefined,
    name: '',
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    database: '',
    password: '',
  });
  testResult.value = null;
  databases.value = []; // Clear databases list
  dialog.value = true;
}

function openEditDialog(conn: ConnectionConfig) {
  isEditing.value = true;
  Object.assign(editedConnection, { ...conn, password: '' });
  testResult.value = null;
  databases.value = []; // Clear databases list - could fetch here if desired
  dialog.value = true;
}

function fetchDatabases() {
  if (!editedConnection.host || !editedConnection.user) {
    testResult.value = { success: false, message: "Please enter Host and User to fetch databases." };
    return;
  }
  isLoadingDatabases.value = true;
  vscode.postMessage({
    command: 'getDatabases',
    connection: { ...editedConnection }
  });
}

function closeDialog() {
  dialog.value = false;
}

function saveConnection() {
  if (!isFormValid.value) {
    testResult.value = { success: false, message: "Please fill in all required fields." };
    return;
  }
  vscode.postMessage({
    command: 'saveConnection',
    connection: { ...editedConnection } // Send a copy of the reactive object
  });
  closeDialog();
  // The list will update automatically when `setConnections` is received
}

function testConnection() {
  if (!isFormValid.value) {
    testResult.value = { success: false, message: "Please fill in all required fields to test." };
    return;
  }
  isTesting.value = true;
  testResult.value = null; // Clear previous result
  vscode.postMessage({
    command: 'testConnection',
    connection: { ...editedConnection } // Send a copy of the reactive object
  });
}

function selectConnection(conn: ConnectionConfig) {
  if (conn.id) {
    activeConnectionId.value = conn.id;
    vscode.setState({ activeConnectionId: conn.id });
    vscode.postMessage({ command: 'setActiveConnection', id: conn.id });
  }
}

function isActive(conn: ConnectionConfig): boolean {
  return conn.id === activeConnectionId.value;
}

function getConnectionStatusIcon(conn: ConnectionConfig) {
  if (conn.id === activeConnectionId.value) {
    return 'mdi-wifi'; // Connected status
  }
  // For now, all others are inactive/not connected visually
  return 'mdi-wifi-off';
}

function getConnectionStatusColor(conn: ConnectionConfig): string {
  if (conn.id === activeConnectionId.value) {
    return 'green';
  }
  return 'grey';
}

// TODO: Implement deleteConnection
function deleteConnection(conn: ConnectionConfig) {
  if (!conn.id) return;

  // Optional: Add confirmation before deleting
  // if (!confirm(`Are you sure you want to delete connection '${conn.name}'?`)) return;

  vscode.postMessage({
    command: 'deleteConnection',
    id: conn.id
  });
}

</script>

<template>
  <v-container fluid class="pa-2">
    <v-row no-gutters class="mb-2 align-center connection-header">
      <v-col class="d-flex align-center">
        <v-icon icon="mdi-database" size="small" class="mr-2"></v-icon>
        <span class="text-subtitle-1 font-weight-bold">Connections</span>
      </v-col>
      <v-col cols="auto" class="d-flex align-center">
        <v-btn color="primary" size="small" variant="flat" @click="openAddDialog">
          Add
        </v-btn>
      </v-col>
    </v-row>

    <v-divider class="mb-2"></v-divider>

    <v-list lines="two" density="compact" class="bg-transparent pa-0">
      <v-list-item v-for="conn in connections" :key="conn.id" @click="selectConnection(conn)"
        class="mb-1 rounded connection-item" :class="{ 'connection-item--active': isActive(conn) }">
        <template v-slot:prepend>
          <v-icon :icon="getConnectionStatusIcon(conn)" :color="getConnectionStatusColor(conn)" size="small"></v-icon>
        </template>

        <v-list-item-title class="text-body-2">{{ conn.name }}</v-list-item-title>
        <v-list-item-subtitle class="text-caption">{{ conn.host }} - {{ conn.database || 'N/A' }}</v-list-item-subtitle>

        <template v-slot:append>
          <div class="d-flex">
            <v-btn icon size="x-small" @click.stop="openEditDialog(conn)" variant="text" color="grey-lighten-1">
              <v-icon icon="mdi-pencil" size="x-small"></v-icon>
            </v-btn>
            <v-btn icon size="x-small" @click.stop="deleteConnection(conn)" variant="text" color="red-lighten-1">
              <v-icon icon="mdi-delete" size="x-small"></v-icon>
            </v-btn>
          </div>
        </template>
      </v-list-item>
      <v-list-item v-if="connections.length === 0">
        <v-list-item-title class="text-caption text-center italic">No connections found.</v-list-item-title>
      </v-list-item>
    </v-list>

    <!-- Add/Edit Connection Dialog -->
    <v-dialog v-model="dialog" persistent max-width="500px">
      <v-card>
        <v-card-title class="text-h6">{{ dialogTitle }}</v-card-title>
        <v-card-text class="pa-4 pt-2">
          <v-row dense>
            <v-col cols="12">
              <v-text-field label="Name*" v-model="editedConnection.name" density="compact" hide-details="auto"
                required></v-text-field>
            </v-col>
            <v-col cols="12" sm="8">
              <v-text-field label="Host*" v-model="editedConnection.host" density="compact" hide-details="auto"
                required></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field label="Port*" v-model="editedConnection.port" type="number" density="compact"
                hide-details="auto" required></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field label="User*" v-model="editedConnection.user" density="compact" hide-details="auto"
                required></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field label="Password" v-model="editedConnection.password" type="password" density="compact"
                hide-details="auto" hint="Leave empty if no password"></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-combobox label="Database" v-model="editedConnection.database" :items="databases"
                :loading="isLoadingDatabases" density="compact" hide-details="auto">
                <template v-slot:append-inner>
                  <v-icon icon="mdi-refresh" @click="fetchDatabases" :disabled="isLoadingDatabases" size="small"
                    style="cursor: pointer"></v-icon>
                </template>
              </v-combobox>
            </v-col>
          </v-row>
          <v-alert v-if="testResult" :type="testResult.success ? 'success' : 'error'" density="compact"
            class="mt-4 mb-0" variant="tonal" closable @update:modelValue="testResult = null">
            {{ testResult.message }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" size="small" @click="closeDialog">
            Cancel
          </v-btn>
          <v-btn color="secondary" variant="tonal" size="small" @click="testConnection" :loading="isTesting"
            :disabled="isTesting || !isFormValid">
            Test
          </v-btn>
          <v-btn color="primary" variant="flat" size="small" @click="saveConnection" :disabled="!isFormValid">
            {{ saveButtonText }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.connection-header {
  font-weight: 600;
}



.title {
  font-size: 1.25rem;
}

/* Ensure container and list backgrounds are transparent */
:deep(.v-container) {
  background: transparent !important;
}

:deep(.v-list) {
  background: transparent !important;
}

.v-text-field,
.v-textarea {
  --v-input-background-color: var(--vscode-input-background);
  --v-input-border-color: var(--vscode-input-border);
  --v-text-field-label-color: var(--vscode-input-foreground);
}



/* Connection list item styling */
.connection-item {
  background-color: transparent !important;
  transition: background-color 0.15s ease;
}



/* Override Vuetify's internal active state */
.connection-item.v-list-item--active {
  background-color: var(--vscode-list-activeSelectionBackground) !important;
}

.connection-item.v-list-item--active :deep(.v-list-item__content) {
  color: var(--vscode-list-activeSelectionForeground) !important;
}

.connection-item:hover:not(.v-list-item--active) {
  background-color: var(--vscode-list-hoverBackground) !important;
}

.connection-item--active {
  background-color: var(--vscode-list-activeSelectionBackground) !important;
}

.connection-item--active :deep(.v-list-item-title),
.connection-item--active :deep(.v-list-item-subtitle) {
  color: var(--vscode-list-activeSelectionForeground) !important;
}

/* Override Vuetify's default overlay on list items */
.connection-item :deep(.v-list-item__overlay) {
  display: none !important;
  opacity: 0 !important;
  background: transparent !important;
}

/* Force override any Vuetify background on active state */
.connection-item :deep(.v-list-item__underlay) {
  display: none !important;
}
</style>