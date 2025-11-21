<template>
  <div class="integrations-view">
    <div class="integrations-header">
      <h1 class="heading-1">Webhook Integrations</h1>
      <button @click="goToWorkspace" class="btn btn-secondary">← Back to Workspace</button>
    </div>

    <div v-if="loading" class="loading">Loading integrations...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="integrations-content">
      <!-- Create New Integration Button -->
      <div class="create-section">
        <button @click="showCreateModal = true" class="btn">
          + Create Webhook Integration
        </button>
      </div>

      <!-- Integrations List -->
      <div v-if="integrations.length === 0" class="empty-state">
        <p>No webhook integrations yet. Create one to get started!</p>
      </div>

      <div v-else class="integrations-list">
        <div 
          v-for="integration in filteredIntegrations" 
          :key="integration._id" 
          class="integration-card card"
        >
          <div class="integration-header">
            <div>
              <h3 class="heading-3">{{ integration.name }}</h3>
              <span class="integration-badge" :class="{ active: integration.active, inactive: !integration.active }">
                {{ integration.active ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="integration-actions">
              <button @click="editIntegration(integration)" class="btn-small">Edit</button>
              <button @click="viewLogs(integration)" class="btn-small">Logs</button>
              <button @click="testWebhook(integration)" class="btn-small btn-accent">Test</button>
              <button @click="deleteIntegration(integration)" class="btn-small btn-secondary">Delete</button>
            </div>
          </div>

          <div class="integration-details">
            <div class="detail-row">
              <span class="detail-label">Channel:</span>
              <span class="detail-value">#{{ integration.channel?.name || 'Unknown' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Webhook URL:</span>
              <div class="webhook-url-container">
                <code class="webhook-url">{{ getWebhookUrl(integration._id) }}</code>
                <button @click="copyWebhookUrl(integration._id)" class="btn-copy">
                  {{ copiedId === integration._id ? '✓ Copied' : 'Copy' }}
                </button>
              </div>
            </div>
            <div v-if="integration.config?.secret" class="detail-row">
              <span class="detail-label">Secret:</span>
              <span class="detail-value">✓ Configured</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingIntegration" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2 class="heading-2">{{ editingIntegration ? 'Edit Integration' : 'Create Webhook Integration' }}</h2>
          <button @click="closeModal" class="btn-close">×</button>
        </div>

        <form @submit.prevent="saveIntegration" class="integration-form">
          <div class="form-group">
            <label>Integration Name</label>
            <input 
              v-model="integrationForm.name" 
              type="text" 
              class="input" 
              placeholder="e.g., GitHub Webhooks"
              required
            />
          </div>

          <div class="form-group">
            <label>Channel</label>
            <select v-model="integrationForm.channel" class="input" required>
              <option value="">Select a channel...</option>
              <option v-for="channel in channels" :key="channel._id" :value="channel._id">
                #{{ channel.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Webhook Secret (Optional)</label>
            <input 
              v-model="integrationForm.secret" 
              type="text" 
              class="input" 
              placeholder="Leave empty for no secret"
            />
            <small class="form-help">If set, external services must send this in the x-webhook-secret header</small>
          </div>

          <div class="form-group">
            <label>Message Template</label>
            <textarea 
              v-model="integrationForm.messageTemplate" 
              class="input input-textarea" 
              rows="6"
              placeholder="Enter template with {{data.field}} syntax..."
              required
            ></textarea>
            <div class="template-help">
              <strong>Template Syntax:</strong>
              <ul>
                <li><code v-pre>{{data.field}}</code> - Access nested fields</li>
                <li><code v-pre>{{data.title || 'Untitled'}}</code> - Default values</li>
                <li><code v-pre>{{#if data.success}}✅{{else}}❌{{/if}}</code> - Conditionals</li>
              </ul>
            </div>
          </div>

          <div class="form-group">
            <button type="button" @click="previewTemplate" class="btn btn-secondary">Preview Template</button>
            <div v-if="previewResult" class="preview-box">
              <strong>Preview:</strong>
              <pre class="preview-content">{{ previewResult }}</pre>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeModal" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save Integration' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Logs Modal -->
    <div v-if="viewingLogs" class="modal-overlay" @click.self="closeLogsModal">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2 class="heading-2">Webhook Logs - {{ viewingLogs.name }}</h2>
          <button @click="closeLogsModal" class="btn-close">×</button>
        </div>

        <div v-if="logsLoading" class="loading">Loading logs...</div>
        <div v-else-if="logsError" class="error">{{ logsError }}</div>
        <div v-else class="logs-content">
          <div v-if="logs.length === 0" class="empty-state">
            No webhook deliveries yet.
          </div>
          <div v-else class="logs-list">
            <div 
              v-for="log in logs" 
              :key="log._id" 
              class="log-item"
              :class="{ success: log.status === 'success', failed: log.status === 'failed' }"
            >
              <div class="log-header">
                <span class="log-status" :class="log.status">
                  {{ log.status === 'success' ? '✓' : '✗' }} {{ log.status.toUpperCase() }}
                </span>
                <span class="log-time">{{ formatTime(log.createdAt) }}</span>
              </div>
              <div v-if="log.error" class="log-error">
                Error: {{ log.error }}
              </div>
              <details class="log-details">
                <summary>View Payload</summary>
                <pre class="log-payload">{{ JSON.stringify(log.payload, null, 2) }}</pre>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const workspaceId = route.params.workspaceId

const loading = ref(true)
const error = ref('')
const integrations = ref([])
const channels = ref([])
const showCreateModal = ref(false)
const editingIntegration = ref(null)
const saving = ref(false)
const copiedId = ref(null)
const previewResult = ref('')
const viewingLogs = ref(null)
const logs = ref([])
const logsLoading = ref(false)
const logsError = ref('')

const integrationForm = ref({
  name: '',
  channel: '',
  secret: '',
  messageTemplate: '{{#if data.action}}[{{data.repository?.full_name || data.repository?.name}}] {{data.action}}: {{data.pull_request?.title || data.issue?.title || \'Event\'}}{{else}}{{data.message || JSON.stringify(data, null, 2)}}{{/if}}'
})

const filteredIntegrations = computed(() => {
  return integrations.value.filter(i => i.type === 'webhook')
})

const getWebhookUrl = (integrationId) => {
  const apiUrl = import.meta.env.VITE_API_URL || window.location.origin.replace(':5173', ':3000')
  return `${apiUrl}/api/integrations/webhook/${integrationId}`
}

const copyWebhookUrl = async (integrationId) => {
  const url = getWebhookUrl(integrationId)
  try {
    await navigator.clipboard.writeText(url)
    copiedId.value = integrationId
    setTimeout(() => {
      copiedId.value = null
    }, 2000)
  } catch (err) {
    alert('Failed to copy URL. Please copy manually.')
  }
}

const fetchIntegrations = async () => {
  loading.value = true
  error.value = ''
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const [integrationsRes, channelsRes] = await Promise.all([
      axios.get(`${apiUrl}/api/integrations/workspace/${workspaceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      axios.get(`${apiUrl}/api/channels/workspace/${workspaceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ])
    
    integrations.value = integrationsRes.data
    channels.value = channelsRes.data
  } catch (err) {
    console.error('❌ Failed to fetch integrations:', err)
    error.value = err.response?.data?.message || 'Failed to load integrations'
    if (err.response?.status === 401) {
      authStore.logout()
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
}

const saveIntegration = async () => {
  saving.value = true
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const payload = {
      type: 'webhook',
      name: integrationForm.value.name,
      workspace: workspaceId,
      channel: integrationForm.value.channel,
      config: {
        secret: integrationForm.value.secret || undefined
      },
      messageTemplate: integrationForm.value.messageTemplate
    }
    
    if (editingIntegration.value) {
      // Update existing
      await axios.patch(`${apiUrl}/api/integrations/${editingIntegration.value._id}`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    } else {
      // Create new
      await axios.post(`${apiUrl}/api/integrations`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    }
    
    await fetchIntegrations()
    closeModal()
  } catch (err) {
    console.error('❌ Failed to save integration:', err)
    alert(err.response?.data?.message || 'Failed to save integration')
  } finally {
    saving.value = false
  }
}

const editIntegration = (integration) => {
  editingIntegration.value = integration
  integrationForm.value = {
    name: integration.name,
    channel: integration.channel._id || integration.channel,
    secret: integration.config?.secret || '',
    messageTemplate: integration.messageTemplate
  }
}

const deleteIntegration = async (integration) => {
  if (!confirm(`Are you sure you want to delete "${integration.name}"?`)) return
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    await axios.delete(`${apiUrl}/api/integrations/${integration._id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    await fetchIntegrations()
  } catch (err) {
    console.error('❌ Failed to delete integration:', err)
    alert(err.response?.data?.message || 'Failed to delete integration')
  }
}

const testWebhook = async (integration) => {
  if (!confirm('Send a test webhook to this integration?')) return
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const testPayload = {
      action: 'test',
      message: 'This is a test webhook',
      repository: {
        name: 'test-repo',
        full_name: 'user/test-repo'
      },
      timestamp: new Date().toISOString()
    }
    
    const response = await axios.post(`${apiUrl}/api/integrations/${integration._id}/test`, {
      testPayload
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    alert('Test webhook sent successfully! Check the channel for the message.')
  } catch (err) {
    console.error('❌ Failed to test webhook:', err)
    alert(err.response?.data?.message || 'Failed to send test webhook')
  }
}

const previewTemplate = async () => {
  if (!integrationForm.value.messageTemplate) return
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const integrationId = editingIntegration.value?._id || 'preview'
    const response = await axios.post(`${apiUrl}/api/integrations/${integrationId}/preview`, {
      template: integrationForm.value.messageTemplate,
      sampleData: {
        event: 'webhook',
        data: {
          action: 'opened',
          repository: {
            name: 'example-repo',
            full_name: 'user/example-repo'
          },
          pull_request: {
            title: 'Example Pull Request',
            number: 42
          },
          success: true,
          message: 'This is a sample webhook payload'
        }
      }
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    previewResult.value = response.data.preview
  } catch (err) {
    console.error('❌ Failed to preview template:', err)
    previewResult.value = 'Error: ' + (err.response?.data?.message || err.message)
  }
}

const viewLogs = async (integration) => {
  viewingLogs.value = integration
  logsLoading.value = true
  logsError.value = ''
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/integrations/${integration._id}/logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    logs.value = response.data
  } catch (err) {
    console.error('❌ Failed to fetch logs:', err)
    logsError.value = err.response?.data?.message || 'Failed to load logs'
  } finally {
    logsLoading.value = false
  }
}

const closeModal = () => {
  showCreateModal.value = false
  editingIntegration.value = null
  integrationForm.value = {
    name: '',
    channel: '',
    secret: '',
    messageTemplate: '{{#if data.action}}[{{data.repository?.full_name || data.repository?.name}}] {{data.action}}: {{data.pull_request?.title || data.issue?.title || \'Event\'}}{{else}}{{data.message || JSON.stringify(data, null, 2)}}{{/if}}'
  }
  previewResult.value = ''
}

const closeLogsModal = () => {
  viewingLogs.value = null
  logs.value = []
}

const formatTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString()
}

const goToWorkspace = () => {
  router.push(`/workspace/${workspaceId}`)
}

onMounted(() => {
  fetchIntegrations()
})
</script>

<style scoped>
.integrations-view {
  padding: var(--space-5);
  max-width: 1200px;
  margin: 0 auto;
}

.integrations-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
}

.integrations-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.create-section {
  display: flex;
  justify-content: flex-end;
}

.integrations-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.integration-card {
  padding: var(--space-5);
}

.integration-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
}

.integration-actions {
  display: flex;
  gap: var(--space-2);
}

.btn-small {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  font-weight: 700;
}

.integration-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  margin-left: var(--space-3);
}

.integration-badge.active {
  background: var(--matisse-green);
  color: white;
}

.integration-badge.inactive {
  background: var(--color-text-muted);
  color: white;
}

.integration-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.detail-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.detail-label {
  font-weight: 700;
  min-width: 120px;
}

.detail-value {
  color: var(--color-text-muted);
}

.webhook-url-container {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
}

.webhook-url {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-alt);
  border: 2px solid var(--color-border);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  word-break: break-all;
}

.btn-copy {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  font-weight: 700;
  white-space: nowrap;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-5);
}

.modal-content {
  background: var(--color-bg);
  border: 4px solid var(--bauhaus-black);
  padding: var(--space-6);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-large {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}

.btn-close {
  background: transparent;
  border: none;
  font-size: var(--text-3xl);
  cursor: pointer;
  color: var(--color-text);
  font-weight: 900;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.integration-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group label {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: var(--text-sm);
}

.input-textarea {
  font-family: var(--font-mono);
  resize: vertical;
}

.form-help {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.template-help {
  padding: var(--space-3);
  background: var(--color-bg-alt);
  border: 2px solid var(--color-border);
  font-size: var(--text-sm);
}

.template-help ul {
  margin: var(--space-2) 0 0 var(--space-5);
  padding: 0;
}

.template-help code {
  background: var(--color-bg);
  padding: 2px 4px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.preview-box {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-alt);
  border: 2px solid var(--color-border);
}

.preview-content {
  margin: var(--space-2) 0 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-sans);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 2px solid var(--color-border);
}

.logs-content {
  max-height: 60vh;
  overflow-y: auto;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.log-item {
  padding: var(--space-4);
  border: 2px solid var(--color-border);
  background: var(--color-bg);
}

.log-item.success {
  border-left: 6px solid var(--matisse-green);
}

.log-item.failed {
  border-left: 6px solid var(--matisse-red);
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.log-status {
  font-weight: 700;
  text-transform: uppercase;
  font-size: var(--text-sm);
}

.log-status.success {
  color: var(--matisse-green);
}

.log-status.failed {
  color: var(--matisse-red);
}

.log-time {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.log-error {
  color: var(--matisse-red);
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.log-details {
  margin-top: var(--space-2);
}

.log-payload {
  margin-top: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-alt);
  border: 2px solid var(--color-border);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-x: auto;
  white-space: pre;
}

.empty-state {
  text-align: center;
  padding: var(--space-8);
  color: var(--color-text-muted);
}

.loading, .error {
  text-align: center;
  padding: var(--space-5);
}

.error {
  color: var(--matisse-red);
  font-weight: 700;
}
</style>

