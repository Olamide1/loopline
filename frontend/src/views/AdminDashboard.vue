<template>
  <div class="admin-dashboard">
    <div class="dashboard-header">
      <h1 class="heading-1">Admin Dashboard</h1>
      <button @click="goToWorkspace" class="btn btn-secondary">← Back to Workspace</button>
    </div>
    
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="dashboard-content">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-icon">📊</div>
          <div class="stat-value">{{ stats.channels || 0 }}</div>
          <div class="stat-label">Channels</div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">💬</div>
          <div class="stat-value">{{ stats.messages || 0 }}</div>
          <div class="stat-label">Messages</div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">👥</div>
          <div class="stat-value">{{ stats.members || 0 }}</div>
          <div class="stat-label">Members</div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">🔌</div>
          <div class="stat-value">{{ stats.integrations || 0 }}</div>
          <div class="stat-label">Integrations</div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">📁</div>
          <div class="stat-value">{{ stats.files || 0 }}</div>
          <div class="stat-label">Files</div>
        </div>
      </div>
      
      <!-- Quick Actions -->
      <div class="actions-section">
        <h2 class="heading-2">Quick Actions</h2>
        <div class="actions-grid">
          <button @click="exportMessages" class="action-btn card">
            <span class="action-icon">📥</span>
            <span class="action-label">Export Messages</span>
          </button>
          <button @click="exportFiles" class="action-btn card">
            <span class="action-icon">📁</span>
            <span class="action-label">Export Files</span>
          </button>
          <button @click="goToSettings" class="action-btn card">
            <span class="action-icon">⚙️</span>
            <span class="action-label">Workspace Settings</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const workspaceId = route.params.workspaceId
const loading = ref(true)
const error = ref('')
const stats = ref({
  channels: 0,
  messages: 0,
  members: 0,
  integrations: 0,
  files: 0
})

const fetchStats = async () => {
  loading.value = true
  error.value = ''
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/admin/workspace/${workspaceId}/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    stats.value = response.data
  } catch (err) {
    console.error('❌ Failed to fetch stats:', err)
    error.value = err.response?.data?.message || 'Failed to load dashboard stats'
    if (err.response?.status === 401) {
      authStore.logout()
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
}

const exportMessages = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/admin/workspace/${workspaceId}/export/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loopline-messages-${workspaceId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (err) {
    console.error('❌ Failed to export messages:', err)
    alert('Failed to export messages')
  }
}

const exportFiles = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/admin/workspace/${workspaceId}/export/files`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loopline-files-${workspaceId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (err) {
    console.error('❌ Failed to export files:', err)
    alert('Failed to export files')
  }
}

const goToSettings = () => {
  router.push(`/workspace/${workspaceId}`)
}

const goToWorkspace = () => {
  router.push(`/workspace/${workspaceId}`)
}

onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
.admin-dashboard {
  padding: var(--space-5);
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100%;
  overflow-y: auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 3px solid var(--color-text);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.stat-card {
  text-align: center;
  padding: var(--space-5);
}

.stat-icon {
  font-size: var(--text-3xl);
  margin-bottom: var(--space-2);
}

.stat-value {
  font-size: var(--text-3xl);
  font-weight: 900;
  margin-bottom: var(--space-1);
}

.stat-label {
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-text-muted);
  font-weight: 700;
}

.actions-section {
  margin-top: var(--space-6);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 3px solid var(--color-text);
}

.action-btn:hover {
  transform: translateY(-4px);
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.2);
}

.action-icon {
  font-size: var(--text-3xl);
}

.action-label {
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.loading, .error {
  text-align: center;
  padding: var(--space-5);
  font-size: var(--text-lg);
  font-weight: 700;
}

.error {
  color: var(--matisse-red);
}
</style>

